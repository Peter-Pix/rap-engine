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

  // Build nodes
  const nodes = Array.from(nodeIds).map((id) => {
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
  const edges = graph.filter(
    (e) => nodeIds.has(e.from) && nodeIds.has(e.to),
  );

  const stats = {
    nodes: nodes.length,
    edges: edges.length,
    artists: artistIds.length,
    albums: albumIds.length,
    labels: labelIds.length,
    locations: locationIds.length,
  };

  return <ScenyContent nodes={nodes} edges={edges} stats={stats} />;
}
