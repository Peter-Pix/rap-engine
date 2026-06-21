import path from "node:path";
import fs from "node:fs";
import type {
  CacheEntities,
  CacheInbound,
  CacheRoutes,
  CacheSearchEntry,
} from "./cache-builder";
import { CACHE_DIR } from "./cache-builder";

// ─── Public reader API ────────────────────────────────────────────────────

// ─── Types (forward-declared for graph-layout reader) ─────────────────────

interface GraphLayoutNode {
  id: string;
  slug: string;
  title: string;
  image?: string;
  degree: number;
  x: number;
  y: number;
}

interface GraphLayoutEdge {
  source: string;
  target: string;
}

export interface GraphLayout {
  width: number;
  height: number;
  nodes: GraphLayoutNode[];
  edges: GraphLayoutEdge[];
}

/**
 * Low-level JSON reader.
 */
function readJson<T>(filename: string): T | null {
  const filePath = path.join(CACHE_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

// ─── Public reader API ────────────────────────────────────────────────────

/**
 * Read `entities.json` — all entities keyed by ID.
 * Returns `null` if the cache hasn't been built yet.
 */
export function readEntities(): CacheEntities | null {
  return readJson<CacheEntities>("entities.json");
}

/**
 * Get a single entity from the cache by ID.
 */
export function readEntityById(id: string) {
  const entities = readEntities();
  return entities?.[id] ?? null;
}

/**
 * Get a single entity from the cache by type + slug.
 */
export function readEntityBySlug(type: string, slug: string) {
  const entities = readEntities();
  if (!entities) return null;
  for (const entity of Object.values(entities)) {
    if (entity.type === type && entity.slug === slug) return entity;
  }
  return null;
}

/**
 * Get all cached entities of a given type.
 */
export function readEntitiesByType(type: string) {
  const entities = readEntities();
  if (!entities) return [];
  return Object.values(entities).filter((e) => e.type === type);
}

/**
 * Read `graph.json` — all normalized graph edges.
 */
export function readGraph() {
  return readJson<Array<{ from: string; relation: string; to: string }>>(
    "graph.json",
  );
}

/**
 * Read `inbound.json` — backlinks indexed by target entity ID.
 */
export function readInbound(): CacheInbound | null {
  return readJson<CacheInbound>("inbound.json");
}

/**
 * Get inbound entity IDs for a given entity.
 */
export function readInboundFor(id: string): string[] {
  const inbound = readInbound();
  return inbound?.[id] ?? [];
}

/**
 * Read `routes.json` — URL route → entity ID.
 */
export function readRoutes(): CacheRoutes | null {
  return readJson<CacheRoutes>("routes.json");
}

/**
 * Read `search-index.json` — lightweight search entries.
 */
export function readSearchIndex(): CacheSearchEntry[] | null {
  return readJson<CacheSearchEntry[]>("search-index.json");
}

/**
 * Read `graph-layout.json` — pre-computed force-directed layout for the
 * homepage network graph. Returns `null` if `build-graph-layout` hasn't run.
 */
export function readGraphLayout(): GraphLayout | null {
  return readJson<GraphLayout>("graph-layout.json");
}

/**
 * Check whether the cache has been built at all.
 */
export function hasCache(): boolean {
  return fs.existsSync(path.join(CACHE_DIR, "entities.json"));
}
