/**
 * Indexation Engine — Core Types
 *
 * Centralised type definitions for SEO scoring, indexation decisions,
 * and sitemap generation.
 */

import type { CacheEntity } from "@/lib/content/cache-builder";
import type { CacheEntities, CacheInbound } from "@/lib/content/cache-builder";

// ─── IndexationState ────────────────────────────────────────────────────

/**
 * Single source of truth for whether an entity is allowed into the
 * public index and — at a higher score — into the XML sitemap.
 *
 * DRAFT / PRIVATE / NOINDEX  →  never exposed
 * CANDIDATE                  →  eligible, but held back (scored too low)
 * INDEXABLE                  →  canonical, follow, but omitted from sitemap
 * AUTHORITATIVE              →  full inclusion in sitemap
 */
export enum IndexationState {
  /** Under construction — not visible. */
  DRAFT = "DRAFT",
  /** Explicit opt-out (e.g. editorial flag). */
  PRIVATE = "PRIVATE",
  /** Force noindex regardless of quality. */
  NOINDEX = "NOINDEX",
  /** Scored but not yet good enough for INDEXABLE. */
  CANDIDATE = "CANDIDATE",
  /** Good enough for canonical, but not included in sitemap. */
  INDEXABLE = "INDEXABLE",
  /** High-quality — included in sitemap, schema, OG, everything. */
  AUTHORITATIVE = "AUTHORITATIVE",
}

// ─── SEO Signals ────────────────────────────────────────────────────────

/**
 * Raw signal values extracted from an entity.
 * Each signal is deterministic and cheap to compute.
 */
export interface SeoSignals {
  descriptionLength: number;
  hasImage: boolean;
  hasFaq: boolean;
  hasSchema: boolean;
  relationCount: number;
  backlinkCount: number;
  contentLength: number;
  profileCompleteness: number; // 0–100
}

// ─── Score Configuration ───────────────────────────────────────────────

/**
 * Tunable weights for every signal that feeds into seoScore.
 * All weights must sum to 100 after normalisation.
 */
export interface ScoreWeights {
  description: number;
  image: number;
  faq: number;
  schema: number;
  relations: number;
  backlinks: number;
  content: number;
  profile: number;
}

/**
 * Thresholds that drive the indexation decision.
 * Must be ordered: candidate < indexable < authoritative.
 */
export interface IndexationThresholds {
  candidate: number;
  indexable: number;
  authoritative: number;
}

/**
 * Complete configuration bundle.
 * Default values are provided by DEFAULT_CONFIG.
 */
export interface IndexationConfig {
  weights: ScoreWeights;
  thresholds: IndexationThresholds;
}

// ─── Scored Entity ──────────────────────────────────────────────────────

/**
 * Result of analysing a single entity through the pipeline.
 * Immutable — produced by the engine, consumed by the sitemap generator.
 */
export interface ScoredEntity {
  entity: CacheEntity;
  signals: SeoSignals;
  seoScore: number; // 0–100, rounded integer
  state: IndexationState;
  graphUpdatedAt: string; // ISO 8601 date (YYYY-MM-DD)
}

// ─── Engine Output ───────────────────────────────────────────────────────

/**
 * Full result set from running the Indexation Engine.
 */
export interface IndexationResult {
  scored: ScoredEntity[];
  // Pre-filtered convenience views
  sitemapEntities: ScoredEntity[];      // state === AUTHORITATIVE
  indexableEntities: ScoredEntity[];    // state >= INDEXABLE
  noindexEntities: ScoredEntity[];      // state < CANDIDATE
}

// ─── Sitemap Entry ──────────────────────────────────────────────────────

/**
 * Normalised entry ready for XML emission.
 * Mirrors MetadataRoute.Sitemap[number] but is explicitly typed.
 */
export interface SitemapEntry {
  url: string;
  lastModified: string; // YYYY-MM-DD
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
  images?: { loc: string; caption?: string }[];
}

/**
 * Future-proof slice descriptor for multi-sitemap support.
 */
export interface SitemapSlice {
  name: string; // e.g. "artists"
  predicate: (scored: ScoredEntity) => boolean;
  priorityBase: number;
  changefreq: "daily" | "weekly" | "monthly";
}
