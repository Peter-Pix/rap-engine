import path from "node:path";
import fs from "node:fs";
import type { UnifiedEntity } from "./types";
import type { GraphEdge } from "./types";
import type { EntityType } from "./constants";
import { TYPE_ROUTE_MAP } from "./constants";
import { normalizeRelations } from "./graph-normalize";
import { getRegistryEntry, RELATION_REGISTRY } from "./relation-registry";

// ─── Cache output directory ───────────────────────────────────────────────

export const CACHE_DIR = path.join(process.cwd(), ".content-cache");

// ─── Serialised output types ──────────────────────────────────────────────

/** Shape of one entity entry in `entities.json` */
export interface CacheEntity {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string;
  publishedAt?: string;
  updatedAt?: string;
  sourceFormat?: string;
  /** Raw MDX content (frontmatter + body) — stripped at render time */
  content: string;
  /** Outbound target IDs, grouped by canonical edge type */
  outbound: Record<string, string[]>;
  /** Optional editorial profile (from profile.json) */
  profile?: Record<string, unknown>;
  /** Extra meta fields (realName, origin, birthDate, label, etc.) */
  extraMeta?: Record<string, unknown>;
}

/** Shape of `entities.json` — all entities keyed by ID */
export type CacheEntities = Record<string, CacheEntity>;

/** Shape of `inbound.json` — each entity ID mapped to the IDs that reference it */
export type CacheInbound = Record<string, string[]>;

/** Shape of `routes.json` — URL route → entity ID */
export type CacheRoutes = Record<string, string>;

/** Shape of one entry in `search-index.json` */
export interface CacheSearchEntry {
  id: string;
  type: EntityType;
  slug: string;
  title: string;
  description: string;
  /** Extra searchable text — realName, origin, etc. */
  context: string;
}

// ─── Slug→ID resolution (for legacy raw-slug targets) ────────────────────

/**
 * Build a type→slug→id index from the full entity map.
 * Used to resolve legacy raw slugs to canonical entity IDs.
 */
function buildSlugIndex(
  entities: Map<string, UnifiedEntity>,
): Map<string, Map<string, string>> {
  const index = new Map<string, Map<string, string>>();
  for (const [id, entity] of entities) {
    const type = entity.meta.type;
    let typeMap = index.get(type);
    if (!typeMap) {
      typeMap = new Map();
      index.set(type, typeMap);
    }
    typeMap.set(entity.meta.slug, id);
  }
  return index;
}

/**
 * Resolve a raw target value (could be a slug or already a full ID) to a
 * canonical entity ID.
 *
 * Strategy:
 * 1. If the value is already a known entity ID → return as-is.
 * 2. If the relation key has an `expectsType` constraint, look up
 *    `{expectedType}_{slug}` in the entity map.
 * 3. Fall back: try all known types for `{type}_{slug}`.
 * 4. If nothing matches, return the original value (unresolved).
 */
function resolveTargetId(
  raw: string,
  authoringKey: string,
  entities: Map<string, UnifiedEntity>,
  slugIndex: Map<string, Map<string, string>>,
): string {
  // Already a known entity ID
  if (entities.has(raw)) return raw;

  const entry = getRegistryEntry(authoringKey);

  // Try expected types from the registry first
  if (entry && entry.expectsType.length > 0) {
    for (const expectedType of entry.expectsType) {
      const candidateId = `${expectedType}_${raw}`;
      if (entities.has(candidateId)) return candidateId;
    }
  }

  // Fallback: try all known types
  for (const [type] of slugIndex) {
    const candidateId = `${type}_${raw}`;
    if (entities.has(candidateId)) return candidateId;
  }

  // Unresolved — keep as-is (could be a future entity or external ref)
  return raw;
}

/**
 * Reverse-lookup: given an edge type (e.g. "HAS_GENRE"), find the
 * authoring key (e.g. "genres") that produced it.
 */
function findAuthoringKey(edgeType: string): string | null {
  for (const entry of RELATION_REGISTRY) {
    if (entry.edgeType === edgeType) return entry.authoringKey;
  }
  return null;
}

// ─── Build helpers ────────────────────────────────────────────────────────

/** Compute a route path string from entity type + slug */
/** Build extra searchable context per entity type. */
function buildSearchContext(entity: UnifiedEntity): string {
  const fm = entity.meta as Record<string, unknown>;
  const parts: string[] = [];

  // Type-specific fields pulled from meta (passthrough extras)
  const fieldMap: Record<string, string[]> = {
    artist: ["realName", "origin", "label"],
    album: ["year"],
    genre: ["origin"],
    label: ["founder", "founded"],
    location: ["region", "country"],
    article: ["author", "category"],
    track: ["duration"],
  };

  const fields = fieldMap[entity.type] ?? [];
  for (const f of fields) {
    const v = fm[f];
    if (typeof v === "string" && v.length > 0) parts.push(v);
  }

  // Also include profile data for deeper searchability
  if (entity.profile) {
    const p = entity.profile;
    if (p.styleTags?.length) parts.push(...p.styleTags);
    if (p.themes?.length) parts.push(...p.themes);
    if (p.shortIntro) parts.push(p.shortIntro);
    if (p.careerSummary) parts.push(p.careerSummary);
    if (p.similarArtists?.length) parts.push(...p.similarArtists);
    if (p.funFacts?.length) parts.push(...p.funFacts);
  }

  return parts.join(" ");
}

function buildRoute(type: string, slug: string): string {
  const prefix = TYPE_ROUTE_MAP[type as EntityType] ?? `/${type}`;
  return `${prefix}/${slug}`;
}

/**
 * Build all 5 cache files from a fully-loaded entity map.
 *
 * Accepts both `Entity` and `UnifiedEntity` — the unified shape is preferred.
 * Idempotent — running twice with the same input produces the same output.
 * Destructive — overwrites all cache files.
 */
export function buildCache(entities: Map<string, UnifiedEntity>): void {
  if (entities.size === 0) {
    writeEmptyCaches();
    return;
  }

  // ── Build slug→id index for legacy resolution ───────────────────────
  const slugIndex = buildSlugIndex(entities);

  // ── Accumulate across all entities ───────────────────────────────────
  const cacheEntities: CacheEntities = {};
  const allEdges: GraphEdge[] = [];
  const routes: CacheRoutes = {};
  const searchIndex: CacheSearchEntry[] = [];

  for (const [id, entity] of entities) {
    // Normalize this entity's relations to graph edges
    const rawEdges = normalizeRelations(id, entity.relations);

    // Resolve raw target slugs to canonical entity IDs
    const edges: GraphEdge[] = [];
    for (const edge of rawEdges) {
      const authoringKey = findAuthoringKey(edge.relation);
      const resolvedTo = resolveTargetId(
        edge.to,
        authoringKey ?? edge.relation,
        entities,
        slugIndex,
      );
      edges.push({ ...edge, to: resolvedTo });
    }
    allEdges.push(...edges);

    // Group outbound edges by type for the node view
    // Use a Set per relation to deduplicate — raw relations.json can mix
    // bare slugs ("boom-bap") and canonical IDs ("genre_boom-bap") for the
    // same target. resolveTargetId() resolves both to the same ID, which
    // would otherwise produce duplicate entries in the outbound array and
    // trigger React "duplicate key" warnings at render time.
    const outbound: Record<string, string[]> = {};
    const outboundSeen: Record<string, Set<string>> = {};
    for (const edge of edges) {
      const seen = outboundSeen[edge.relation] ?? (outboundSeen[edge.relation] = new Set());
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      const list = outbound[edge.relation] ?? (outbound[edge.relation] = []);
      list.push(edge.to);
    }

    // Extra meta fields for rich display (exclude base fields)
    const fm = entity.meta as Record<string, unknown>;
    const extraMeta: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fm)) {
      if (!['type', 'slug', 'title', 'description', 'publishedAt', 'updatedAt'].includes(key) && value !== undefined && value !== null) {
        extraMeta[key] = value;
      }
    }

    // entities.json entry
    cacheEntities[id] = {
      id,
      type: entity.meta.type,
      slug: entity.meta.slug,
      title: entity.meta.title,
      description: entity.meta.description,
      publishedAt: entity.meta.publishedAt,
      updatedAt: entity.meta.updatedAt,
      sourceFormat: entity.sourceFormat,
      content: entity.content,
      outbound,
      profile: entity.profile as Record<string, unknown> | undefined,
      extraMeta,
    };
    const route = buildRoute(entity.meta.type, entity.meta.slug);
    routes[route] = id;

    // search-index.json entry
    searchIndex.push({
      id,
      type: entity.meta.type as EntityType,
      slug: entity.meta.slug,
      title: entity.meta.title,
      description: entity.meta.description,
      context: buildSearchContext(entity),
    });
  }

  // ── Compute inbound backlinks from all edges ─────────────────────────
  const inbound: CacheInbound = {};
  for (const edge of allEdges) {
    const list = inbound[edge.to] ?? (inbound[edge.to] = []);
    if (!list.includes(edge.from)) {
      list.push(edge.from);
    }
  }
  // Ensure every entity has at least an empty inbound array
  for (const id of entities.keys()) {
    if (!inbound[id]) inbound[id] = [];
  }

  // ── Deduplicate edges ────────────────────────────────────────────────
  const seen = new Set<string>();
  const dedupedEdges: GraphEdge[] = [];
  for (const edge of allEdges) {
    const fingerprint = `${edge.from}::${edge.relation}::${edge.to}`;
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      dedupedEdges.push(edge);
    }
  }

  // ── Write to disk ────────────────────────────────────────────────────
  ensureCacheDir();
  writeJson("entities.json", cacheEntities);
  writeJson("graph.json", dedupedEdges);
  writeJson("inbound.json", inbound);
  writeJson("routes.json", routes);
  writeJson("search-index.json", searchIndex);
}

// ─── Empty caches (no-entity safe fallback) ───────────────────────────────

function writeEmptyCaches(): void {
  ensureCacheDir();
  writeJson("entities.json", {});
  writeJson("graph.json", []);
  writeJson("inbound.json", {});
  writeJson("routes.json", {});
  writeJson("search-index.json", []);
}

// ─── Low-level I/O ────────────────────────────────────────────────────────

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function writeJson(filename: string, data: unknown): void {
  const filePath = path.join(CACHE_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
