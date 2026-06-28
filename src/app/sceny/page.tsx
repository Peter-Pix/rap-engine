import type { Metadata } from "next";
import { readEntities, readGraph } from "@/lib/content/cache-reader";
import { NetworkCanvas } from "@/components/graph/NetworkCanvas";

export const metadata: Metadata = {
  title: "Celá síť — 4rap.cz",
  description: "Interaktivní mapa všech vazeb v české a slovenské rapové scéně. Prozkoumej propojení mezi interprety, alby, labely a městy.",
};

interface GraphNode {
  id: string;
  type: string;
  slug: string;
  title: string;
  image?: string | null;
  degree: number;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

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
  const nodes: GraphNode[] = Array.from(nodeIds).map((id) => {
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
  const edges: GraphEdge[] = graph.filter(
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

  return (
    <>
      <main className="h-[100dvh] flex flex-col bg-zinc-950 overflow-hidden">
        <div className="px-3 sm:px-8 py-2 sm:py-4 flex-shrink-0">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tighter text-white uppercase leading-[0.92]">
            Celá síť
          </h1>
          <p className="text-[10px] sm:text-sm text-white/50 mt-0.5 sm:mt-1">
            {stats.nodes} entit · {stats.edges} vazeb · {stats.artists} interpretů · {stats.albums} alb · {stats.labels} labelů · {stats.locations} měst
          </p>
        </div>
        <div className="flex-1 min-h-0 px-0 sm:px-8 pb-0 sm:pb-4">
          <NetworkCanvas nodes={nodes} edges={edges} />
        </div>
      </main>
    </>
  );
}
