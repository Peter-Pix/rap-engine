import type { Relations } from "./schemas";
import type { GraphEdge } from "./types";
import { lookupEdgeType } from "./relation-registry";

// ─── Single-entity normalization ──────────────────────────────────────────

/**
 * Convert one entity's `relations.json` payload into a clean list of
 * `GraphEdge` objects.
 *
 * Rules applied:
 * 1. Empty arrays (`[]`) produce zero edges — no noise.
 * 2. Each authoring key is mapped to its canonical `EdgeType` via the registry.
 * 3. Unknown authoring keys are silently skipped (registry is the gatekeeper).
 * 4. Each target ID gets its own edge.
 *
 * @param sourceId  The `id` of the entity that *owns* the relations file (edge source).
 * @param relations The parsed `relations.json` object.
 * @returns Flat `GraphEdge[]` — ready for graph building.
 */
export function normalizeRelations(
  sourceId: string,
  relations: Relations,
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (const [authoringKey, targets] of Object.entries(relations)) {
    // Type-safe: Relations has only `string[]` values, but runtime can surprise us
    if (!Array.isArray(targets) || targets.length === 0) continue;

    const edgeType = lookupEdgeType(authoringKey);
    if (!edgeType) continue; // unknown key → skip gracefully

    for (const targetId of targets) {
      if (typeof targetId !== "string" || targetId.length === 0) continue;
      edges.push({
        from: sourceId,
        relation: edgeType as GraphEdge["relation"],
        to: targetId,
      });
    }
  }

  return edges;
}

// ─── Batch normalization ──────────────────────────────────────────────────

/**
 * Normalize a batch of entities at once — useful during graph build.
 *
 * Accepts a `Map<entityId, Relations>` or `Record<string, Relations>`.
 * Deduplication is NOT performed; if the same edge appears twice (e.g. from
 * duplicate data), both are kept. Dedup is the graph builder's job.
 */
export function normalizeRelationsBatch(
  sources: Map<string, Relations> | Record<string, Relations>,
): GraphEdge[] {
  const entries =
    sources instanceof Map ? [...sources.entries()] : Object.entries(sources);

  return entries.flatMap(([sourceId, relations]) =>
    normalizeRelations(sourceId, relations),
  );
}

// ─── Edge grouping (for node hydration) ───────────────────────────────────

export interface GroupedEdges {
  /** Outbound edges keyed by canonical edge type */
  outbound: Record<string, string[]>;
}

/**
 * Group a flat edge list by relation type, collecting target IDs.
 * Useful when hydrating an `EntityNode` with its outbound adjacency list.
 *
 * @param fromId  Only edges with `from === fromId` are included.
 * @param edges   The flat edge list (from normalizeRelations or the full graph).
 */
export function groupEdges(fromId: string, edges: GraphEdge[]): GroupedEdges {
  const outbound: Record<string, string[]> = {};

  for (const edge of edges) {
    if (edge.from !== fromId) continue;
    const list = outbound[edge.relation] ?? (outbound[edge.relation] = []);
    list.push(edge.to);
  }

  return { outbound };
}
