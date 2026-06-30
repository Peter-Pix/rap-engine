/**
 * Indexation Engine — Graph-aware lastModified
 *
 * Computes the effective modification date for an entity by considering
 * not just its own updatedAt, but also the newest update among linked
 * entities (albums, tracks, articles).
 */

import type { CacheEntity, CacheEntities } from "@/lib/content/cache-builder";

/**
 * Derive the maximum updatedAt date from an entity and its graph neighbours.
 *
 * Algorithm:
 *   graphUpdatedAt = max(
 *     entity.updatedAt,
 *     newest linked album.updatedAt,
 *     newest linked track.updatedAt,
 *     newest linked article.updatedAt,
 *     newest linked label.updatedAt
 *   )
 *
 * Only follows relations that carry temporal significance (creative works).
 * Ignores genre/style/theme/mood which rarely change independently.
 */
export function computeGraphLastMod(
  entity: CacheEntity,
  allEntities: CacheEntities,
): string {
  const dates: string[] = [];

  // 1. Own timestamp
  if (entity.updatedAt) dates.push(normaliseDate(entity.updatedAt));
  if (entity.publishedAt) dates.push(normaliseDate(entity.publishedAt));

  // 2. Linked temporal entities — follow outbound edges
  const temporalEdgeTypes = new Set([
    "HAS_ALBUM",       // artist → album
    "BELONGS_TO_ALBUM", // track → album
    "HAS_TRACK",        // album → track, artist → track
    "PRODUCED_BY",      // track → producer
    "RELEASED_BY",      // album → label, artist → label
    "FEATURES",         // track → featured artist
    "SIGNED_TO",        // artist → label
    "PART_OF",          // collective membership, movement
  ]);

  const outbound = entity.outbound ?? {};
  for (const [edgeType, targetIds] of Object.entries(outbound)) {
    if (!temporalEdgeTypes.has(edgeType)) continue;
    if (!Array.isArray(targetIds)) continue;

    for (const targetId of targetIds) {
      const linked = allEntities[targetId];
      if (!linked) continue;
      if (linked.updatedAt) dates.push(normaliseDate(linked.updatedAt));
      if (linked.publishedAt) dates.push(normaliseDate(linked.publishedAt));
    }
  }

  // 3. Fallback if no dates found
  if (dates.length === 0) {
    return new Date().toISOString().slice(0, 10);
  }

  // Sort descending and return the newest
  dates.sort().reverse();
  return dates[0];
}

/**
 * Parse any ISO-ish string and return a clean YYYY-MM-DD.
 * Invalid inputs fall back to today's date.
 */
function normaliseDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Build a lookup table of graphLastMod for every entity.
 * Call once and pass the map into the sitemap generator.
 */
export function buildGraphLastModMap(
  entities: CacheEntities,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [id, entity] of Object.entries(entities)) {
    map.set(id, computeGraphLastMod(entity, entities));
  }
  return map;
}
