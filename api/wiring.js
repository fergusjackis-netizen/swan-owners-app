// Wiring graph engine for Smart Yacht — answers electrical-circuit questions
// DETERMINISTICALLY from a digitized netlist instead of letting Claude guess
// from a PDF wiring diagram.
//
// The netlist data is COMPILED from wiring/*.netlist.json by
// wiring/build-netlist.cjs into api/wiring-data.js. To add or edit a subsystem,
// edit the JSON files and run `node wiring/build-netlist.cjs`. Keep component
// ids unique across locations (the DC cabinet's 100A fuse is "DCMS_F05", the
// MSB board's 5A fuse is "F05"); subsystems link via shared nodes (BATT, MSB,
// POS_BUS, POS_DIRECT...) so a trace runs from a load back to the battery.
import { NETLIST } from './wiring-data.js'

const byId = Object.fromEntries(NETLIST.components.map(c => [c.id, c]));
const fwd = {}, rev = {};
for (const e of NETLIST.connections) {
  // Signal/data links (S-link, NMEA2000, CAN, remote networks) carry control,
  // not current. They must not be walked as power paths, or "what protects X"
  // would leak across a data bus into unrelated circuits.
  if (e.signal) continue;
  (fwd[e.from] ||= []).push([e.to, e]);
  (rev[e.to]   ||= []).push([e.from, e]);
}

// Structural nodes are wiring infrastructure, not "loads" an owner asks about.
const STRUCTURAL = new Set(['busbar', 'fuse', 'breaker', 'switch', 'junction_box', 'contactor', 'relay', 'shunt', 'battery', 'source']);
const isLoad = id => byId[id] && !STRUCTURAL.has(byId[id].type);
// Overcurrent protection comes as DC fuses and AC breakers — treat both the same.
const isProtective = type => type === 'fuse' || type === 'breaker';
const isNegBus = id => byId[id] && byId[id].type === 'busbar' && byId[id].polarity === 'negative';
const nameOf = id => (byId[id] ? `${byId[id].name} (-${id})` : id);

const tokenize = s => String(s || '').toLowerCase().match(/[a-z0-9]+/g) || [];

// Rank components against an owner's free-text query. Exact id/name match wins;
// otherwise score by token overlap across id, name and keywords so "port nav
// light" resolves to "Side light port" rather than "Compass light port".
function findComponent(query, prefer) {
  const q = String(query || '').toLowerCase().trim().replace(/^-/, '');
  if (!q) return [];
  const qTokens = tokenize(q);
  const scored = NETLIST.components.map(c => {
    let score;
    if (q === c.id.toLowerCase() || q === c.name.toLowerCase()) {
      score = 1000;
    } else {
      const hay = new Set([...tokenize(c.id), ...tokenize(c.name), ...(c.keywords || [])]);
      score = qTokens.filter(t => hay.has(t)).length;
      if (c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) score += 0.5;
    }
    // Fuses/breakers are named after the load they protect ("Fresh water pump
    // fuse" vs the pump itself), so device queries tie with — or even outrank —
    // the real device. Apply a decisive type preference (non-exact matches) so
    // a load query lands on the load and a fuse query lands on the fuse.
    if (score > 0 && score < 1000) {
      if (prefer === 'load') score += isLoad(c.id) ? 1 : -1;
      else if (prefer === 'fuse') score += isProtective(c.type) ? 1 : -1;
      else if (prefer && c.type === prefer) score += 1;
    }
    return { id: c.id, score };
  }).filter(x => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map(x => x.id);
}
const resolve = (q, prefer) => findComponent(q, prefer)[0] || null;

function whatProtects(component) {
  const cid = resolve(component, 'load');
  if (!cid) return { error: `No component matching '${component}'` };
  // Walk upstream to the FIRST fuse(s) on each branch (the local protection,
  // not the 250A main fuse further up the trunk). A load reachable via parallel
  // paths (e.g. a pump fed through both a manual switch and a float switch) can
  // hit the same fuse twice, so dedupe by id.
  const fuses = [], fuseIds = new Set(), seen = new Set(), queue = [cid];
  while (queue.length) {
    const node = queue.shift();
    if (seen.has(node)) continue;
    seen.add(node);
    for (const [src] of (rev[node] || [])) {
      const c = byId[src] || {};
      if (isProtective(c.type)) {
        if (!fuseIds.has(src)) { fuseIds.add(src); fuses.push({ id: src, name: c.name, rating_A: c.rating_A, location: c.location, type: c.type }); }
      } else queue.push(src);
    }
  }
  return { component: nameOf(cid), protected_by: fuses };
}

function whatsOnFuse(fuse) {
  let fid = resolve(fuse, 'fuse');
  if (!fid) return { error: `No fuse matching '${fuse}'` };
  // If the query named a device rather than a fuse/breaker (e.g. "forepeak bilge
  // pump"), redirect to the protection that feeds it so the answer is useful.
  if (byId[fid] && !isProtective(byId[fid].type)) {
    const prot = whatProtects(fuse).protected_by;
    if (prot && prot.length) fid = prot[0].id;
    else return { error: `'${fuse}' resolved to ${nameOf(fid)}, which is not a fuse/breaker and has no protecting device modelled.` };
  }
  // Everything downstream that is a real load. Traverse through positive
  // busbars/switches but never through the negative bus (everything joins it).
  const loads = new Set(), seen = new Set(), queue = [fid];
  while (queue.length) {
    const node = queue.shift();
    if (seen.has(node)) continue;
    seen.add(node);
    for (const [dest] of (fwd[node] || [])) {
      if (isLoad(dest)) loads.add(nameOf(dest));
      if (!isNegBus(dest)) queue.push(dest);
    }
  }
  const f = byId[fid] || {};
  return { fuse: nameOf(fid), rating_A: f.rating_A, powers: [...loads].sort() };
}

function traceCircuit(component) {
  const cid = resolve(component, 'load');
  if (!cid) return { error: `No component matching '${component}'` };
  // Walk upstream (positive side only — rev edges never include the neg bus)
  // to the nearest battery, or to a supply root if no battery is modelled yet.
  const prev = {}, seen = new Set([cid]), queue = [cid], roots = [];
  let target = null;
  while (queue.length) {
    const node = queue.shift();
    if (byId[node] && byId[node].type === 'battery') { target = node; break; }
    const ups = rev[node] || [];
    if (ups.length === 0 && node !== cid) roots.push(node);
    for (const [src, edge] of ups) {
      if (!seen.has(src)) { seen.add(src); prev[src] = [node, edge]; queue.push(src); }
    }
  }
  target = target || roots[0];
  if (!target) return { component: nameOf(cid), path_from_supply: [], note: 'No upstream supply modelled for this component.' };
  const chain = [];
  let node = target;
  while (node !== cid) {
    const [next, edge] = prev[node];
    const seg = { from: nameOf(node), to: nameOf(next) };
    if (edge.wire) seg.wire = edge.wire;
    if (edge.gauge_mm2) seg.gauge_mm2 = edge.gauge_mm2;
    if (!edge.verified) seg.unverified = true;
    chain.push(seg);
    node = next;
  }
  return { component: nameOf(cid), path_from_supply: chain };
}

// Anthropic tool definitions — what Claude sees and can call.
export const WIRING_TOOLS = [
  {
    name: 'what_protects',
    description: 'Given an electrical component/light/device/winch on the yacht, return which fuse(s) protect it and their amp rating and location. Use when an owner reports something electrical is dead and asks which fuse to check.',
    input_schema: {
      type: 'object',
      properties: { component: { type: 'string', description: 'Component name or id, e.g. "port nav light", "primary winch", "inverter", "F05".' } },
      required: ['component'],
    },
  },
  {
    name: 'whats_on_fuse',
    description: 'Given a fuse id or name, list every load powered by that fuse. Use to tell whether one dead device vs. several points to a blown fuse, or what a fuse feeds.',
    input_schema: {
      type: 'object',
      properties: { fuse: { type: 'string', description: 'Fuse id or name, e.g. "F05", "nav lights", "battery main fuse".' } },
      required: ['fuse'],
    },
  },
  {
    name: 'trace_circuit',
    description: 'Trace the full electrical path for a component from the battery through the main fuse, main switch, busbars, sub-fuses, switches, junction boxes and wires. Use to guide fault-finding step by step.',
    input_schema: {
      type: 'object',
      properties: { component: { type: 'string', description: 'Component name or id to trace.' } },
      required: ['component'],
    },
  },
];

const HANDLERS = {
  what_protects: input => whatProtects(input.component),
  whats_on_fuse: input => whatsOnFuse(input.fuse),
  trace_circuit: input => traceCircuit(input.component),
};

export function runWiringTool(name, input) {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Unknown tool '${name}'` };
  try {
    return handler(input || {});
  } catch (e) {
    return { error: e.message };
  }
}

export const isWiringTool = name => Object.prototype.hasOwnProperty.call(HANDLERS, name);

export const WIRING_SYSTEM_HINT =
  'You have DIRECT ACCESS to a digitized model of this vessel\'s electrical wiring via tools ' +
  '(what_protects, whats_on_fuse, trace_circuit). It currently covers the DC main distribution ' +
  '(battery, main switch, main fuse, 600A busbar, consumer fuses for the inverter/charger, winches, ' +
  'furler and the main switch board), the navigation/exterior lights, and the four bilge pumps ' +
  '(main fwd/aft, forepeak, lazarette, each with a manual switch and an automatic float switch). For ANY electrical ' +
  'fault-finding question — dead lights or equipment, fuses, what powers what — call these tools and ' +
  'answer from their exact results instead of guessing from documents. If a returned circuit segment ' +
  'is flagged "unverified", state the fact but tell the crew to confirm that segment against the wiring diagram.';
