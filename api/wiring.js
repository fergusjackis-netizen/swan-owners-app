// Wiring graph engine for Smart Yacht — answers electrical-circuit questions
// DETERMINISTICALLY from a digitized netlist instead of letting Claude guess
// from a PDF wiring diagram.
//
// MULTI-MODEL: netlists are keyed by vessel model (swan-48, swan-58, ...),
// compiled from wiring/models/<key>/*.netlist.json by wiring/build-netlist.cjs
// into api/wiring-data.js. Each request resolves the asking boat's model to its
// netlist; the same tools serve every owner the right wiring. Digitize a model
// once here -> every owner of that model gets it.
import { NETLISTS } from './wiring-data.js'

const STRUCTURAL = new Set(['busbar', 'fuse', 'breaker', 'switch', 'junction_box', 'contactor', 'relay', 'shunt', 'battery', 'source']);
const isProtective = type => type === 'fuse' || type === 'breaker';
const tokenize = s => String(s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// ---- model resolution -------------------------------------------------------
// Map an owner's boat model (id like "swan-48" or display name like "Swan 48
// Mk2") to a digitized netlist key. Returns the key or null.
function resolveModelKey(modelInput) {
  const n = norm(modelInput);
  if (!n) return null;
  for (const [key, nl] of Object.entries(NETLISTS)) {
    const candidates = [key, nl.meta?.name, ...(nl.meta?.aliases || [])].map(norm).filter(Boolean);
    if (candidates.includes(n)) return key;
  }
  // looser: the input contains a model's key/name (or vice versa) as a token run
  for (const [key, nl] of Object.entries(NETLISTS)) {
    const candidates = [key, nl.meta?.name, ...(nl.meta?.aliases || [])].map(norm).filter(Boolean);
    if (candidates.some(c => c.length >= 4 && (n.includes(c) || c.includes(n)))) return key;
  }
  return null;
}

export const hasWiringModel = modelInput => resolveModelKey(modelInput) !== null;
export const availableModels = () => Object.values(NETLISTS).map(nl => nl.meta?.name || nl.meta?.key);

// ---- per-vessel graph + queries (built once per model, cached) --------------
const vesselCache = new Map();

function makeVessel(netlist) {
  const byId = Object.fromEntries(netlist.components.map(c => [c.id, c]));
  const fwd = {}, rev = {};
  for (const e of netlist.connections) {
    // Signal/data links (S-link, NMEA2000, CAN) carry control, not current —
    // never walked as power paths, or "what protects X" leaks across a data bus.
    if (e.signal) continue;
    (fwd[e.from] ||= []).push([e.to, e]);
    (rev[e.to]   ||= []).push([e.from, e]);
  }
  const isLoad = id => byId[id] && !STRUCTURAL.has(byId[id].type);
  const isNegBus = id => byId[id] && byId[id].type === 'busbar' && byId[id].polarity === 'negative';
  const nameOf = id => (byId[id] ? `${byId[id].name} (-${id})` : id);

  // Rank components against an owner's free-text query.
  function findComponent(query, prefer) {
    const q = String(query || '').toLowerCase().trim().replace(/^-/, '');
    if (!q) return [];
    const qTokens = tokenize(q);
    const scored = netlist.components.map(c => {
      let score;
      if (q === c.id.toLowerCase() || q === c.name.toLowerCase()) {
        score = 1000;
      } else {
        const hay = new Set([...tokenize(c.id), ...tokenize(c.name), ...(c.keywords || [])]);
        score = qTokens.filter(t => hay.has(t)).length;
        if (c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) score += 0.5;
      }
      // Fuses/breakers are named after the load they protect, so device queries
      // tie with — or outrank — the real device. Decisive type preference.
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
    if (byId[fid] && !isProtective(byId[fid].type)) {
      const prot = whatProtects(fuse).protected_by;
      if (prot && prot.length) fid = prot[0].id;
      else return { error: `'${fuse}' resolved to ${nameOf(fid)}, which is not a fuse/breaker and has no protecting device modelled.` };
    }
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

  return { whatProtects, whatsOnFuse, traceCircuit };
}

function getVessel(modelInput) {
  const key = resolveModelKey(modelInput);
  if (!key) return null;
  if (!vesselCache.has(key)) vesselCache.set(key, makeVessel(NETLISTS[key]));
  return vesselCache.get(key);
}

// ---- Anthropic tool surface -------------------------------------------------
export const WIRING_TOOLS = [
  {
    name: 'what_protects',
    description: 'Given an electrical component/light/device/pump/winch on this vessel, return which fuse(s)/breaker(s) protect it, with amp rating and location. Use when an owner reports something electrical is dead and asks which fuse to check.',
    input_schema: { type: 'object', properties: { component: { type: 'string', description: 'Component name or id, e.g. "port nav light", "fresh water pump", "inverter", "F05".' } }, required: ['component'] },
  },
  {
    name: 'whats_on_fuse',
    description: 'Given a fuse/breaker id or name, list every load it powers. Use to tell whether one dead device vs. several points to a blown fuse, or what a fuse feeds.',
    input_schema: { type: 'object', properties: { fuse: { type: 'string', description: 'Fuse/breaker id or name, e.g. "F05", "nav lights", "battery main fuse".' } }, required: ['fuse'] },
  },
  {
    name: 'trace_circuit',
    description: 'Trace the full electrical path for a component from the battery/supply through the main fuse, main switch, busbars, sub-fuses, switches, junction boxes and wires. Use to guide fault-finding step by step.',
    input_schema: { type: 'object', properties: { component: { type: 'string', description: 'Component name or id to trace.' } }, required: ['component'] },
  },
];

const TOOL_NAMES = new Set(WIRING_TOOLS.map(t => t.name));
export const isWiringTool = name => TOOL_NAMES.has(name);

// Run a wiring tool against the asking vessel's model. `model` is the owner's
// boat model (id or display name); without a digitized netlist for it we say so.
export function runWiringTool(name, input, model) {
  if (!isWiringTool(name)) return { error: `Unknown tool '${name}'` };
  const vessel = getVessel(model);
  if (!vessel) return { error: `No digitized wiring model for this vessel (${model || 'unknown model'}) yet. Answer from the vessel's documents instead.` };
  try {
    const args = input || {};
    if (name === 'what_protects') return vessel.whatProtects(args.component);
    if (name === 'whats_on_fuse') return vessel.whatsOnFuse(args.fuse);
    if (name === 'trace_circuit') return vessel.traceCircuit(args.component);
    return { error: `Unhandled tool '${name}'` };
  } catch (e) {
    return { error: e.message };
  }
}

// System hint, tailored to whether THIS vessel's model is digitized.
export function wiringSystemHint(model) {
  const key = resolveModelKey(model);
  if (!key) return '';
  const nl = NETLISTS[key];
  const name = nl.meta?.name || key;
  return `You have DIRECT ACCESS to a digitized model of THIS vessel's wiring (${name}) via tools ` +
    '(what_protects, whats_on_fuse, trace_circuit). For ANY fault-finding question — dead lights, pumps or ' +
    'equipment, fuses/breakers, what powers what — call these tools and answer from their exact results ' +
    'instead of guessing from documents. If a returned segment is flagged "unverified", say so and tell the ' +
    'crew to confirm it against the wiring diagram.';
}
