import { BaseMeta, Profile, Relations } from "./schemas";
import type { EdgeType } from "./relation-registry";

export type { EdgeType };

// ─── Source format discriminant ───────────────────────────────────────────

/** Indicates which filesystem layout produced the entity. */
export type SourceFormat = "graph-folder" | "legacy-flat";

// ─── Full Entity (graph-folder format) ────────────────────────────────────

/** Complete runtime representation of one entity after file loading. */
export interface Entity {
  /** Folder name under `content/entities/` */
  id: string;
  /** Parsed `meta.json` */
  meta: BaseMeta;
  /** Raw MDX string from `entity.mdx` */
  mdx: string;
  /** Parsed `relations.json` */
  relations: Relations;
  /** Optional parsed `profile.json` (editorial content from Base44) */
  profile?: Profile;
}

// ─── Unified Entity (cross-format) ────────────────────────────────────────

/**
 * Normalised shape returned by the unified resolver (`entity-resolver.ts`).
 *
 * Identical data model regardless of whether the entity came from
 * `content/entities/[id]/` (graph-folder) or legacy `content/<type>/<slug>/`.
 */
export interface UnifiedEntity {
  id: string;
  type: string;
  slug: string;
  meta: BaseMeta;
  /** Full MDX string (frontmatter + body) */
  content: string;
  /** Outbound relations */
  relations: Relations;
  /** Which filesystem format was used to load this entity */
  sourceFormat: SourceFormat;
  /** Optional editorial profile (from profile.json) */
  profile?: Profile;
}

// ─── Entity Node (graph vertex) ───────────────────────────────────────────

/** Lightweight node stored in the build-time graph cache. */
export interface EntityNode {
  id: string;
  type: string;
  slug: string;
  title: string;
  /** Outbound edge target IDs, grouped by relation category. */
  outbound: Record<string, string[]>;
  /** Inbound references (backlinks), populated at build time. */
  inbound: Record<string, string[]>;
}

// ─── Graph Edge ───────────────────────────────────────────────────────────

/** A directed edge from one entity to another. */
export interface GraphEdge {
  from: string;
  to: string;
  /** Canonical edge type from the relation registry (e.g. "HAS_GENRE") */
  relation: EdgeType;
}

// ─── Build-Time Graph – the in-memory cache ──────────────────────────────

export interface KnowledgeGraph {
  nodes: Map<string, EntityNode>;
  edges: GraphEdge[];
  /** Fast lookup: for a given target ID, which entities point to it? */
  backlinks: Map<string, GraphEdge[]>;
}

// ─── Type helpers ────────────────────────────────────────────────────────

/** Narrowed `BaseMeta` discriminated by `type`. */
export type TypedMeta<T extends BaseMeta["type"]> = Extract<BaseMeta, { type: T }>;
