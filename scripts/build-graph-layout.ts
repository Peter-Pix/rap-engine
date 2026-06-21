#!/usr/bin/env -S npx tsx

/**
 * Build-time network graph layout for the homepage "Nejpropojenější interpreti" section.
 *
 * Reads .content-cache/graph.json, picks the top N most-connected artists
 * (RELATED_ARTIST and SIGNED_TO edges), runs a deterministic Fruchterman–Reingold
 * force-directed layout, and writes positions to .content-cache/graph-layout.json.
 *
 * Usage:
 *   npx tsx scripts/build-graph-layout.ts
 *
 * Output schema (graph-layout.json):
 * {
 *   width: number,
 *   height: number,
 *   nodes: [{ id, slug, title, image, degree, x, y }, ...],
 *   edges: [{ source, target }, ...]
 * }
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CACHE_DIR = path.join(process.cwd(), ".content-cache");
const OUTPUT_FILE = path.join(CACHE_DIR, "graph-layout.json");
const TOP_N = 20;          // how many top artists to include
const WIDTH = 600;
const HEIGHT = 360;
const ITERATIONS = 300;
const AREA = WIDTH * HEIGHT;
const K = Math.sqrt(AREA / TOP_N) * 0.85; // ideal edge length

// Deterministic PRNG (mulberry32) for reproducible layouts
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Edge { from: string; relation: string; to: string }
interface Entity { id: string; type: string; slug: string; title: string; image?: string }

interface LayoutNode {
  id: string;
  slug: string;
  title: string;
  image?: string;
  degree: number;
  x: number;
  y: number;
}

interface LayoutEdge {
  source: string; // node index in nodes array
  target: string;
}

interface LayoutOutput {
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

function main() {
  if (!fs.existsSync(CACHE_DIR)) {
    console.error(`❌ Cache dir not found: ${CACHE_DIR}. Run build-content-cache first.`);
    process.exit(2);
  }

  const entities: Record<string, Entity> = JSON.parse(
    fs.readFileSync(path.join(CACHE_DIR, "entities.json"), "utf-8"),
  );
  const graph: Edge[] = JSON.parse(
    fs.readFileSync(path.join(CACHE_DIR, "graph.json"), "utf-8"),
  );

  // 1) Compute degree centrality for artists
  const degree: Record<string, number> = {};
  for (const e of graph) {
    if (entities[e.from]?.type === "artist") degree[e.from] = (degree[e.from] ?? 0) + 1;
    if (entities[e.to]?.type === "artist") degree[e.to] = (degree[e.to] ?? 0) + 1;
  }

  // 2) Pick top N artists
  const top = Object.entries(degree)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([id]) => id);
  const topSet = new Set(top);

  // 3) Collect edges between top artists (RELATED_ARTIST, RELATED_TO, SIGNED_TO)
  //    For SIGNED_TO we project label→artist as artist↔artist edge.
  const allowedRelations = new Set(["RELATED_ARTIST", "RELATED_TO", "HAS_ALBUM", "MEMBER_OF"]);
  const edgeMap = new Map<string, { a: string; b: string }>();
  for (const e of graph) {
    if (!allowedRelations.has(e.relation)) continue;
    const fromArtist = entities[e.from]?.type === "artist" ? e.from : null;
    const toArtist = entities[e.to]?.type === "artist" ? e.to : null;
    if (!fromArtist || !toArtist) continue;
    if (!topSet.has(fromArtist) || !topSet.has(toArtist)) continue;
    if (fromArtist === toArtist) continue;
    const key = [fromArtist, toArtist].sort().join("::");
    if (!edgeMap.has(key)) edgeMap.set(key, { a: fromArtist, b: toArtist });
  }

  // 4) Fruchterman–Reingold layout
  const rng = mulberry32(42);
  const nodes: LayoutNode[] = top.map((id) => {
    const e = entities[id];
    return {
      id,
      slug: e.slug,
      title: e.title,
      image: e.image,
      degree: degree[id],
      x: WIDTH / 2 + (rng() - 0.5) * WIDTH * 0.6,
      y: HEIGHT / 2 + (rng() - 0.5) * HEIGHT * 0.6,
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
  const edges = Array.from(edgeMap.values());

  let temperature = WIDTH * 0.1;
  const cooling = temperature / ITERATIONS;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsive forces between all pairs
    for (let i = 0; i < nodes.length; i++) {
      const v = nodes[i];
      v.x += 0; v.y += 0;
      let fx = 0;
      let fy = 0;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const u = nodes[j];
        let dx = v.x - u.x;
        let dy = v.y - u.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) {
          dx = (rng() - 0.5) * 0.1;
          dy = (rng() - 0.5) * 0.1;
          dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        }
        const force = (K * K) / dist;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }
      v.x += (fx / nodes.length) * 0.01;
      v.y += (fy / nodes.length) * 0.01;
    }

    // Attractive forces along edges
    for (const e of edges) {
      const a = nodeById.get(e.a);
      const b = nodeById.get(e.b);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist * dist) / K;
      const fx = (dx / dist) * force * 0.01;
      const fy = (dy / dist) * force * 0.01;
      a.x -= fx;
      a.y -= fy;
      b.x += fx;
      b.y += fy;
    }

    // Cooling & bounds
    for (const n of nodes) {
      const margin = 50;
      n.x = Math.max(margin, Math.min(WIDTH - margin, n.x));
      n.y = Math.max(margin, Math.min(HEIGHT - margin, n.y));
    }
    temperature = Math.max(0.5, temperature - cooling);
  }

  // 5) Sort nodes deterministically (by degree desc, then title)
  nodes.sort((a, b) => b.degree - a.degree || a.title.localeCompare(b.title, "cs"));

  // 6) Re-index edges after sort
  const idToIdx = new Map(nodes.map((n, i) => [n.id, String(i)] as const));
  const layoutEdges: LayoutEdge[] = edges
    .map((e) => ({
      source: idToIdx.get(e.a)!,
      target: idToIdx.get(e.b)!,
    }))
    .filter((e) => e.source != null && e.target != null);

  const output: LayoutOutput = {
    width: WIDTH,
    height: HEIGHT,
    nodes,
    edges: layoutEdges,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`✅ Graph layout written: ${OUTPUT_FILE}`);
  console.log(`   ${nodes.length} nodes, ${layoutEdges.length} edges`);
}

main();
