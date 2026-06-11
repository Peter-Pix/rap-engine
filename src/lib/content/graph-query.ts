import {
  readEntities,
  readEntityById,
  readInboundFor,
  readGraph,
  readEntitiesByType,
} from "./cache-reader";
import type { CacheEntity } from "./cache-builder";
import { RELATION_REGISTRY } from "./relation-registry";

// ─── Result types ─────────────────────────────────────────────────────────

export interface BacklinkResult {
  id: string;
  type: string;
  slug: string;
  title: string;
  /** Which edge type(s) point from this entity to the queried target */
  via: string[];
}

export interface OutgoingResult {
  id: string;
  type: string;
  slug: string;
  title: string;
  relation: string;
}

export interface RelatedEntityResult {
  id: string;
  type: string;
  slug: string;
  title: string;
  /** 1 = direct outgoing, 2 = second-degree */
  degree: number;
  /** Paths that connect the source to this entity */
  paths: string[];
}

export interface SimilarityBreakdown {
  sharedGenres: string[];
  sharedStyles: string[];
  sharedMoods: string[];
  sharedScenes: string[];
  sharedLabels: string[];
  sharedLocations: string[];
  directConnections: number;
}

export interface SimilarityResult {
  id: string;
  type: string;
  slug: string;
  title: string;
  /** 0–1 normalised similarity score */
  score: number;
  breakdown: SimilarityBreakdown;
}

export interface GenreNetworkNode {
  id: string;
  type: string;
  slug: string;
  title: string;
  /** How this node connects to the queried genre */
  relation: string;
}

export interface GenreNetwork {
  /** The queried genre itself */
  genre: GenreNetworkNode;
  /** Entities that HAVE this genre (inbound HAS_GENRE) */
  artists: GenreNetworkNode[];
  /** Entities related via PART_OF (sub-genres, parent genres) */
  hierarchy: GenreNetworkNode[];
  /** Entities related via RELATED_TO */
  related: GenreNetworkNode[];
  /** Entities related via INFLUENCED_BY */
  influencedBy: GenreNetworkNode[];
}

// ─── Similarity weight config (extensible) ────────────────────────────────

export interface SimilarityWeights {
  genre: number;
  style: number;
  mood: number;
  scene: number;
  label: number;
  location: number;
  /** Bonus per direct edge between the two entities */
  directConnection: number;
}

export const DEFAULT_WEIGHTS: SimilarityWeights = {
  genre: 0.3,
  style: 0.25,
  mood: 0.15,
  scene: 0.15,
  label: 0.1,
  location: 0.05,
  directConnection: 0.05,
};

// ─── Internal helpers ─────────────────────────────────────────────────────

interface EdgeRecord {
  from: string;
  relation: string;
  to: string;
}

/** Build a target→sources index from graph.json edges. */
function buildTargetIndex(): Map<string, EdgeRecord[]> {
  const edges = readGraph();
  const index = new Map<string, EdgeRecord[]>();
  if (!edges) return index;

  for (const e of edges) {
    const list = index.get(e.to) ?? [];
    list.push(e);
    index.set(e.to, list);
  }
  return index;
}

/** Build a source→targets index from graph.json edges. */
function buildSourceIndex(): Map<string, EdgeRecord[]> {
  const edges = readGraph();
  const index = new Map<string, EdgeRecord[]>();
  if (!edges) return index;

  for (const e of edges) {
    const list = index.get(e.from) ?? [];
    list.push(e);
    index.set(e.from, list);
  }
  return index;
}

/** Resolve an entity ID to a minimal display shape. */
function resolveDisplay(id: string): {
  id: string;
  type: string;
  slug: string;
  title: string;
} | null {
  const e = readEntityById(id);
  if (!e) return null;
  return { id: e.id, type: e.type, slug: e.slug, title: e.title };
}

/**
 * Extract a set of target IDs from an entity's outbound for a given
 * set of relation keys. Returns a flat deduplicated array.
 */
function getOutboundTargets(
  entity: CacheEntity,
  keys: string[],
): string[] {
  const ids = new Set<string>();
  for (const key of keys) {
    const targets = entity.outbound[key];
    if (targets) {
      for (const t of targets) ids.add(t);
    }
  }
  return [...ids];
}

/**
 * Get the human-readable label for a relation edge type.
 */
function edgeLabel(edgeType: string): string {
  for (const entry of RELATION_REGISTRY) {
    if (entry.edgeType === edgeType) return entry.description;
  }
  return edgeType;
}

// ─── 1. getBacklinks ──────────────────────────────────────────────────────

/**
 * Return every entity that points TO `entityId`, with the edge types
 * that connect them.
 *
 * Data source: `inbound.json` (who points here) + `graph.json` (which edges).
 */
export function getBacklinks(entityId: string): BacklinkResult[] {
  const inboundIds = readInboundFor(entityId);
  if (!inboundIds.length) return [];

  const targetIndex = buildTargetIndex();

  return inboundIds
    .map((id) => {
      const display = resolveDisplay(id);
      if (!display) return null;

      // Find all edges where from=id AND to=entityId
      const edges = targetIndex.get(entityId) ?? [];
      const via = edges
        .filter((e) => e.from === id)
        .map((e) => e.relation);

      return {
        ...display,
        via: via.length ? [...new Set(via)] : ["UNKNOWN"],
      };
    })
    .filter((r): r is BacklinkResult => r !== null);
}

// ─── 2. getOutgoing ───────────────────────────────────────────────────────

/**
 * Return every entity that `entityId` points TO, grouped by edge type.
 *
 * Data source: `entities.json` outbound field (pre-grouped at build time).
 */
export function getOutgoing(entityId: string): OutgoingResult[] {
  const entity = readEntityById(entityId);
  if (!entity) return [];

  const results: OutgoingResult[] = [];

  for (const [relation, targetIds] of Object.entries(entity.outbound)) {
    for (const tid of targetIds) {
      const display = resolveDisplay(tid);
      if (display) {
        results.push({ ...display, relation });
      }
    }
  }

  return results;
}

// ─── 3. getRelatedEntities ────────────────────────────────────────────────

/**
 * Return direct outgoing targets (degree 1) + selected second-degree nodes.
 *
 * Second-degree nodes are entities pointed to by the direct targets,
 * excluding the source entity itself and any entity already in degree 1.
 * Nodes reached through multiple paths are ranked higher.
 *
 * @param entityId  Source entity
 * @param limit     Max total results (default 50)
 */
export function getRelatedEntities(
  entityId: string,
  limit = 50,
): RelatedEntityResult[] {
  const source = readEntityById(entityId);
  if (!source) return [];

  const sourceIndex = buildSourceIndex();

  // ── Degree 1: direct outgoing ───────────────────────────────────────
  const degree1Ids = new Set<string>();
  const degree1Results: RelatedEntityResult[] = [];

  for (const [relation, targetIds] of Object.entries(source.outbound)) {
    for (const tid of targetIds) {
      if (degree1Ids.has(tid)) continue;
      degree1Ids.add(tid);

      const display = resolveDisplay(tid);
      if (display) {
        degree1Results.push({
          ...display,
          degree: 1,
          paths: [relation],
        });
      }
    }
  }

  // ── Degree 2: targets of targets ────────────────────────────────────
  // Count how many paths lead to each second-degree node
  const degree2Paths = new Map<string, string[]>();

  for (const d1Id of degree1Ids) {
    const d1Edges = sourceIndex.get(d1Id) ?? [];
    for (const edge of d1Edges) {
      // Skip if it points back to source or to another degree-1 node
      if (edge.to === entityId || degree1Ids.has(edge.to)) continue;

      const paths = degree2Paths.get(edge.to) ?? [];
      // Path description: "d1Title → edgeType → d2Title"
      const d1Display = resolveDisplay(d1Id);
      const pathDesc = d1Display
        ? `${d1Display.title} → ${edge.relation}`
        : `${d1Id} → ${edge.relation}`;
      if (!paths.includes(pathDesc)) {
        paths.push(pathDesc);
      }
      degree2Paths.set(edge.to, paths);
    }
  }

  // Sort degree-2 by path count (more paths = more relevant)
  const degree2Sorted = [...degree2Paths.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, paths]) => {
      const display = resolveDisplay(id);
      if (!display) return null;
      return {
        ...display,
        degree: 2 as const,
        paths,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // ── Combine, respecting limit ───────────────────────────────────────
  const combined = [...degree1Results];
  const remaining = limit - combined.length;

  if (remaining > 0) {
    combined.push(...degree2Sorted.slice(0, remaining));
  }

  return combined;
}

// ─── 4. getSimilarArtists ─────────────────────────────────────────────────

/**
 * Compute similarity between `artistId` and every other artist.
 *
 * Similarity is based on shared categorical attributes:
 * - genres (HAS_GENRE)
 * - styles (HAS_STYLE)
 * - moods (HAS_MOOD)
 * - scenes (BELONGS_TO_SCENE)
 * - labels (SIGNED_TO)
 * - locations (ORIGINATES_FROM)
 *
 * Plus a bonus for each direct edge between the two artists.
 *
 * Scoring formula:
 *   score = Σ (weight_k × |shared_k| / max(|source_k|, 1))
 *          + directConnectionWeight × directEdgeCount
 *
 * The result is normalised to 0–1 (weights sum to 1.0 by convention).
 *
 * @param artistId  Source artist entity ID
 * @param weights   Optional custom weights (defaults to DEFAULT_WEIGHTS)
 * @param minScore  Minimum score threshold (default 0.05)
 * @param limit     Max results (default 25)
 */
export function getSimilarArtists(
  artistId: string,
  weights: SimilarityWeights = DEFAULT_WEIGHTS,
  minScore = 0.05,
  limit = 25,
): SimilarityResult[] {
  const source = readEntityById(artistId);
  if (!source || source.type !== "artist") return [];

  const allArtists = readEntitiesByType("artist").filter(
    (a) => a.id !== artistId,
  );
  if (!allArtists.length) return [];

  // ── Extract source attribute sets (cache uses edge type keys) ──────
  const sourceGenres = new Set(source.outbound["HAS_GENRE"] ?? []);
  const sourceStyles = new Set(source.outbound["HAS_STYLE"] ?? []);
  const sourceMoods = new Set(source.outbound["HAS_MOOD"] ?? []);
  const sourceScenes = new Set(source.outbound["BELONGS_TO_SCENE"] ?? []);
  const sourceLabels = new Set(source.outbound["SIGNED_TO"] ?? []);
  const sourceLocations = new Set(source.outbound["ORIGINATES_FROM"] ?? []);

  // ── Build direct-edge lookup: does source have an edge to candidate? ─
  const sourceOutboundIds = new Set(
    Object.values(source.outbound).flat(),
  );
  const candidateInboundFromSource = new Set<string>();
  // Also check if candidate points TO source (RELATED_ARTIST, INFLUENCED_BY, etc.)
  const targetIndex = buildTargetIndex();
  const sourceInboundEdges = targetIndex.get(artistId) ?? [];

  // ── Score each candidate ────────────────────────────────────────────
  const results: SimilarityResult[] = [];

  for (const candidate of allArtists) {
    const cGenres = new Set(candidate.outbound["HAS_GENRE"] ?? []);
    const cStyles = new Set(candidate.outbound["HAS_STYLE"] ?? []);
    const cMoods = new Set(candidate.outbound["HAS_MOOD"] ?? []);
    const cScenes = new Set(candidate.outbound["BELONGS_TO_SCENE"] ?? []);
    const cLabels = new Set(candidate.outbound["SIGNED_TO"] ?? []);
    const cLocations = new Set(candidate.outbound["ORIGINATES_FROM"] ?? []);

    // Shared sets
    const sharedGenres = intersect(sourceGenres, cGenres);
    const sharedStyles = intersect(sourceStyles, cStyles);
    const sharedMoods = intersect(sourceMoods, cMoods);
    const sharedScenes = intersect(sourceScenes, cScenes);
    const sharedLabels = intersect(sourceLabels, cLabels);
    const sharedLocations = intersect(sourceLocations, cLocations);

    // Direct connections: source → candidate OR candidate → source
    const directOut = sourceOutboundIds.has(candidate.id) ? 1 : 0;
    const directIn = sourceInboundEdges.some((e) => e.from === candidate.id)
      ? 1
      : 0;
    const directConnections = directOut + directIn;

    // Weighted score
    const score =
      weights.genre * ratio(sharedGenres.length, sourceGenres.size) +
      weights.style * ratio(sharedStyles.length, sourceStyles.size) +
      weights.mood * ratio(sharedMoods.length, sourceMoods.size) +
      weights.scene * ratio(sharedScenes.length, sourceScenes.size) +
      weights.label * ratio(sharedLabels.length, sourceLabels.size) +
      weights.location * ratio(sharedLocations.length, sourceLocations.size) +
      weights.directConnection * Math.min(directConnections, 3); // cap at 3 edges

    if (score >= minScore) {
      results.push({
        id: candidate.id,
        type: candidate.type,
        slug: candidate.slug,
        title: candidate.title,
        score: Math.min(score, 1), // clamp to 1.0
        breakdown: {
          sharedGenres,
          sharedStyles,
          sharedMoods,
          sharedScenes,
          sharedLabels,
          sharedLocations,
          directConnections,
        },
      });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// ─── 5. getGenreNetwork ────────────────────────────────────────────────────

/**
 * Build a network view around a genre entity.
 *
 * Includes:
 * - **artists**: entities that HAVE this genre (inbound HAS_GENRE)
 * - **hierarchy**: parent/child genres via PART_OF
 * - **related**: entities connected via RELATED_TO
 * - **influencedBy**: entities connected via INFLUENCED_BY
 *
 * @param genreId  Genre entity ID (must be type "genre")
 */
export function getGenreNetwork(genreId: string): GenreNetwork | null {
  const genre = readEntityById(genreId);
  if (!genre || genre.type !== "genre") return null;

  const targetIndex = buildTargetIndex();
  const sourceIndex = buildSourceIndex();

  // ── Genre node ──────────────────────────────────────────────────────
  const genreNode: GenreNetworkNode = {
    id: genre.id,
    type: genre.type,
    slug: genre.slug,
    title: genre.title,
    relation: "SELF",
  };

  // ── Artists (inbound HAS_GENRE) ──────────────────────────────────────
  const hasGenreEdges = (targetIndex.get(genreId) ?? []).filter(
    (e) => e.relation === "HAS_GENRE",
  );
  const artists = hasGenreEdges
    .map((e) => {
      const d = resolveDisplay(e.from);
      return d ? { ...d, relation: "HAS_GENRE" } : null;
    })
    .filter((n): n is GenreNetworkNode => n !== null);

  // ── Hierarchy (PART_OF — both directions) ───────────────────────────
  // genre is PART_OF something (parent) OR something is PART_OF genre (child)
  const hierarchy: GenreNetworkNode[] = [];

  // Outbound: genre → PART_OF → parent genre
  const partOfOut = genre.outbound["PART_OF"] ?? [];
  for (const tid of partOfOut) {
    const d = resolveDisplay(tid);
    if (d) hierarchy.push({ ...d, relation: "PART_OF (parent)" });
  }

  // Inbound: child genre → PART_OF → this genre
  const partOfIn = (targetIndex.get(genreId) ?? []).filter(
    (e) => e.relation === "PART_OF",
  );
  for (const e of partOfIn) {
    const d = resolveDisplay(e.from);
    if (d) hierarchy.push({ ...d, relation: "PART_OF (child)" });
  }

  // ── Related (RELATED_TO — both directions) ──────────────────────────
  const related: GenreNetworkNode[] = [];

  const relatedOut = genre.outbound["RELATED_TO"] ?? [];
  for (const tid of relatedOut) {
    const d = resolveDisplay(tid);
    if (d) related.push({ ...d, relation: "RELATED_TO" });
  }

  const relatedIn = (targetIndex.get(genreId) ?? []).filter(
    (e) => e.relation === "RELATED_TO",
  );
  for (const e of relatedIn) {
    const d = resolveDisplay(e.from);
    if (d && !related.some((r) => r.id === d.id)) {
      related.push({ ...d, relation: "RELATED_TO" });
    }
  }

  // ── InfluencedBy (INFLUENCED_BY — both directions) ──────────────────
  const influencedBy: GenreNetworkNode[] = [];

  const infOut = genre.outbound["INFLUENCED_BY"] ?? [];
  for (const tid of infOut) {
    const d = resolveDisplay(tid);
    if (d) influencedBy.push({ ...d, relation: "INFLUENCED_BY" });
  }

  const infIn = (targetIndex.get(genreId) ?? []).filter(
    (e) => e.relation === "INFLUENCED_BY",
  );
  for (const e of infIn) {
    const d = resolveDisplay(e.from);
    if (d && !influencedBy.some((r) => r.id === d.id)) {
      influencedBy.push({ ...d, relation: "INFLUENCED_BY" });
    }
  }

  return {
    genre: genreNode,
    artists,
    hierarchy,
    related,
    influencedBy,
  };
}

// ─── 6. Convenience: getEntityGraphSummary ────────────────────────────────

export interface EntityGraphSummary {
  entity: {
    id: string;
    type: string;
    slug: string;
    title: string;
    description: string;
  };
  outgoingCount: number;
  inboundCount: number;
  /** Top 5 similar entities (artists only for artist source, empty otherwise) */
  similar: SimilarityResult[];
  /** Top 10 related entities (degree 1 + 2) */
  related: RelatedEntityResult[];
}

/**
 * One-call summary of an entity's position in the graph.
 *
 * Combines backlinks, outgoing, related, and (for artists) similar artists
 * into a single response. Useful for entity page "sidebar" data.
 */
export function getEntityGraphSummary(
  entityId: string,
): EntityGraphSummary | null {
  const entity = readEntityById(entityId);
  if (!entity) return null;

  const backlinks = getBacklinks(entityId);
  const related = getRelatedEntities(entityId, 10);

  let similar: SimilarityResult[] = [];
  if (entity.type === "artist") {
    similar = getSimilarArtists(entityId, DEFAULT_WEIGHTS, 0.05, 5);
  }

  return {
    entity: {
      id: entity.id,
      type: entity.type,
      slug: entity.slug,
      title: entity.title,
      description: entity.description,
    },
    outgoingCount: Object.values(entity.outbound).flat().length,
    inboundCount: backlinks.length,
    similar,
    related,
  };
}

// ─── Pure utility ─────────────────────────────────────────────────────────

function intersect<T>(a: Set<T>, b: Set<T>): T[] {
  const result: T[] = [];
  for (const item of a) {
    if (b.has(item)) result.push(item);
  }
  return result;
}

function ratio(shared: number, sourceTotal: number): number {
  if (sourceTotal === 0) return 0;
  return shared / sourceTotal;
}
