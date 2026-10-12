import type { Metadata } from "next";
import { readEntities, readGraph } from "@/lib/content/cache-reader";
import ScenyContent from "./ScenyContent";

export const metadata: Metadata = {
  title: "Celá síť — 4rap.cz",
  description: "Interaktivní mapa všech vazeb v české a slovenské rapové scéně. Prozkoumej propojení mezi interprety, alby, labely a městy.",
};

export default function ScenyPage() {
  const entities = readEntities();
  const graph = readGraph();

  if (!entities || !graph) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">Načítání grafu...</p>
      </div>
    );
  }

  // ── Filter: artists + top albums + top labels + top locations ──
  const nodeIds = new Set<string>();

  // All artists
  const artistIds = Object.entries(entities)
    .filter(([_, v]) => v.type === "artist")
    .map(([k]) => k);
  artistIds.forEach((id) => nodeIds.add(id));

  // Top 50 albums by edge count
  const albumIds = Object.entries(entities)
    .filter(([_, v]) => v.type === "album")
    .map(([k]) => ({
      id: k,
      edges: graph.filter((e) => e.from === k || e.to === k).length,
    }))
    .sort((a, b) => b.edges - a.edges)
    .slice(0, 50)
    .map((a) => a.id);
  albumIds.forEach((id) => nodeIds.add(id));

  // Top 20 labels
  const labelIds = Object.entries(entities)
    .filter(([_, v]) => v.type === "label")
    .map(([k]) => ({
      id: k,
      edges: graph.filter((e) => e.from === k || e.to === k).length,
    }))
    .sort((a, b) => b.edges - a.edges)
    .slice(0, 20)
    .map((a) => a.id);
  labelIds.forEach((id) => nodeIds.add(id));

  // Top 20 locations
  const locationIds = Object.entries(entities)
    .filter(([_, v]) => v.type === "location")
    .map(([k]) => ({
      id: k,
      edges: graph.filter((e) => e.from === k || e.to === k).length,
    }))
    .sort((a, b) => b.edges - a.edges)
    .slice(0, 20)
    .map((a) => a.id);
  locationIds.forEach((id) => nodeIds.add(id));

  // ── Prune isolated nodes ──────────────────────────────────────────
  // Uzel, který po filtraci nemá žádnou hranu, by se v mapě zobrazil jako
  // osamocený ostrůvek — a to je nesmysl: každá entita ve scéně musí být
  // na něco napojená. Proto iterativně odebíráme uzly bez hran, dokud se
  // graf neustálí. Odstraněním uzlu můžou osiřet jeho sousedé → opakujeme.
  const working = new Set(nodeIds);
  let visibleEdges = graph.filter(
    (e) => working.has(e.from) && working.has(e.to),
  );
  for (;;) {
    const connected = new Set<string>();
    for (const e of visibleEdges) {
      connected.add(e.from);
      connected.add(e.to);
    }
    const orphans = [...working].filter((id) => !connected.has(id));
    if (orphans.length === 0) break;
    for (const id of orphans) working.delete(id);
    visibleEdges = graph.filter(
      (e) => working.has(e.from) && working.has(e.to),
    );
  }
  const nodeIdsPruned = working;

  // Build nodes
  const nodes = Array.from(nodeIdsPruned).map((id) => {
    const ent = entities[id];
    return {
      id,
      type: ent.type,
      slug: ent.slug,
      title: ent.title,
      image: ent.image ?? null,
      degree: graph.filter((e) => e.from === id || e.to === id).length,
    };
  });

  // Build edges (only between visible nodes)
  const edges = visibleEdges;

  const stats = {
    nodes: nodes.length,
    edges: edges.length,
    artists: nodes.filter((n) => n.type === "artist").length,
    albums: nodes.filter((n) => n.type === "album").length,
    labels: nodes.filter((n) => n.type === "label").length,
    locations: nodes.filter((n) => n.type === "location").length,
  };

  return <ScenyContent nodes={nodes} edges={edges} stats={stats} />;
}
