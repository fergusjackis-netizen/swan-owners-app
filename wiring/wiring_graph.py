"""
Wiring graph query engine for the Swan 48-233 electrical system.

Loads a netlist (components + connections) and answers circuit questions
DETERMINISTICALLY by walking the graph — no guessing from a PDF.

These functions are exactly what you expose to Claude as tools:
    find_component(query)      -> match a component by name/id
    what_protects(component)   -> which fuse(s) feed it, and their rating
    whats_on_fuse(fuse)        -> everything downstream of a fuse
    trace_circuit(component)   -> full path from the load back to the busbar

Run `python wiring_graph.py` for a demo.
"""
import json
import os
from collections import defaultdict, deque

HERE = os.path.dirname(os.path.abspath(__file__))


class WiringGraph:
    def __init__(self, netlist_path):
        with open(netlist_path, encoding="utf-8") as f:
            data = json.load(f)
        self.meta = data.get("_meta", {})
        self.components = {c["id"]: c for c in data["components"]}
        self.edges = data["connections"]
        # adjacency in both directions (the circuit is undirected for tracing)
        self.fwd = defaultdict(list)   # source -> [(dest, edge)]
        self.rev = defaultdict(list)   # dest   -> [(source, edge)]
        for e in self.edges:
            self.fwd[e["from"]].append((e["to"], e))
            self.rev[e["to"]].append((e["from"], e))

    # ---- helpers -----------------------------------------------------------
    def _name(self, cid):
        c = self.components.get(cid)
        return f"{c['name']} (-{cid})" if c else cid

    def find_component(self, query):
        """Fuzzy-ish match on id or name. Returns list of component ids."""
        q = query.lower().strip().lstrip("-")
        hits = []
        for cid, c in self.components.items():
            if q == cid.lower() or q in c["name"].lower() or q in cid.lower():
                hits.append(cid)
        return hits

    # ---- the three tools Claude would call ---------------------------------
    def what_protects(self, component):
        """Walk upstream from a load to the first fuse(s) feeding it."""
        cid = self._resolve(component)
        if not cid:
            return {"error": f"No component matching '{component}'"}
        fuses, seen, q = [], set(), deque([cid])
        while q:
            node = q.popleft()
            if node in seen:
                continue
            seen.add(node)
            for src, _ in self.rev[node]:
                c = self.components.get(src, {})
                if c.get("type") == "fuse":
                    fuses.append({"id": src, "name": c["name"],
                                  "rating_A": c.get("rating_A"),
                                  "location": c.get("location")})
                else:
                    q.append(src)
        return {"component": self._name(cid), "protected_by": fuses}

    def whats_on_fuse(self, fuse):
        """Everything downstream of a fuse (the loads it powers)."""
        fid = self._resolve(fuse)
        if not fid:
            return {"error": f"No fuse matching '{fuse}'"}
        loads, seen, q = [], set(), deque([fid])
        while q:
            node = q.popleft()
            if node in seen:
                continue
            seen.add(node)
            for dest, _ in self.fwd[node]:
                c = self.components.get(dest, {})
                if c.get("type") == "light":
                    loads.append(self._name(dest))
                if c.get("type") != "busbar":   # don't walk back through XNEG
                    q.append(dest)
        f = self.components.get(fid, {})
        return {"fuse": self._name(fid), "rating_A": f.get("rating_A"),
                "powers": sorted(set(loads))}

    def trace_circuit(self, component):
        """Shortest path from the load back to the positive busbar (MSB)."""
        cid = self._resolve(component)
        if not cid:
            return {"error": f"No component matching '{component}'"}
        # BFS from component to MSB over reverse edges, remember the path
        prev, seen, q = {}, {cid}, deque([cid])
        target = None
        while q:
            node = q.popleft()
            if node == "MSB":
                target = node
                break
            for src, edge in self.rev[node]:
                if src not in seen:
                    seen.add(src)
                    prev[src] = (node, edge)
                    q.append(src)
        if target is None:
            return {"error": f"No path from {cid} to the busbar"}
        # rebuild path MSB -> ... -> component
        chain, node = [], "MSB"
        while node != cid:
            nxt, edge = prev[node]
            seg = {"from": self._name(node), "to": self._name(nxt)}
            if edge.get("wire"):
                seg["wire"] = edge["wire"]
            if edge.get("gauge_mm2"):
                seg["gauge_mm2"] = edge["gauge_mm2"]
            if not edge.get("verified", False):
                seg["unverified"] = True
            chain.append(seg)
            node = nxt
        return {"component": self._name(cid), "path_from_supply": chain}

    def _resolve(self, component):
        hits = self.find_component(component)
        return hits[0] if hits else None


def _demo():
    g = WiringGraph(os.path.join(HERE, "nav_lights.json"))
    print(f"Loaded: {g.meta['vessel']}")
    print(f"Subsystem: {g.meta['subsystem']} — {len(g.components)} components, {len(g.edges)} connections\n")

    print("Q: \"My port nav light is dead — what fuse do I check?\"")
    print("   ", g.what_protects("Side light port"), "\n")

    print("Q: \"What else is on the nav-lights fuse F05?\"")
    print("   ", g.whats_on_fuse("F05"), "\n")

    print("Q: \"Trace the compass light starboard circuit.\"")
    r = g.trace_circuit("Compass light stbd")
    print("    component:", r["component"])
    for seg in r["path_from_supply"]:
        flag = "  [UNVERIFIED]" if seg.get("unverified") else ""
        wire = f"  via {seg['wire']}" if seg.get("wire") else ""
        print(f"      {seg['from']:32} -> {seg['to']}{wire}{flag}")


if __name__ == "__main__":
    _demo()
