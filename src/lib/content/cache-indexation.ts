/**
 * Cache builder extension — Indexation State
 *
 * Writes `indexation-state.json` at build time so the sitemap generator
 * doesn't need to re-run scoring at request time.
 *
 * Called from `scripts/build-content-cache.ts` after the main cache is built.
 */

import type { CacheEntities, CacheInbound } from "./cache-builder";
import { runIndexationEngine } from "@/lib/indexation";
import type { IndexationResult } from "@/lib/indexation";
import fs from "node:fs";
import path from "node:path";
import { CACHE_DIR } from "./cache-builder";

/**
 * Minimal serialised form of a ScoredEntity.
 * Deterministic — sort order is preserved.
 */
export interface SerialisedIndexationState {
  id: string;
  type: string;
  slug: string;
  seoScore: number;
  state: string;
  graphUpdatedAt: string;
  signals: {
    descriptionLength: number;
    hasImage: boolean;
    hasFaq: boolean;
    hasSchema: boolean;
    relationCount: number;
    backlinkCount: number;
    contentLength: number;
    profileCompleteness: number;
  };
}

/** Summary statistics for observability. */
export interface IndexationSummary {
  total: number;
  authoritative: number;
  indexable: number;
  candidate: number;
  noindex: number;
  draft: number;
  private: number;
  avgScore: number;
}

export interface IndexationCache {
  generatedAt: string;
  summary: IndexationSummary;
  entities: SerialisedIndexationState[];
}

/**
 * Build and write `indexation-state.json`.
 *
 * @param entities   Full entity cache
 * @param inbound    Backlinks cache
 * @param config     Optional custom thresholds/weights
 */
export function buildIndexationCache(
  entities: CacheEntities,
  inbound: CacheInbound,
): void {
  const result = runIndexationEngine(entities, inbound);

  const serialised: SerialisedIndexationState[] = result.scored.map((s) => ({
    id: s.entity.id,
    type: s.entity.type,
    slug: s.entity.slug,
    seoScore: s.seoScore,
    state: s.state,
    graphUpdatedAt: s.graphUpdatedAt,
    signals: { ...s.signals },
  }));

  const summary: IndexationSummary = {
    total: result.scored.length,
    authoritative: result.sitemapEntities.length,
    indexable: result.indexableEntities.length,
    candidate: result.scored.filter((s) => s.state === "CANDIDATE").length,
    noindex: result.noindexEntities.length,
    draft: result.scored.filter((s) => s.state === "DRAFT").length,
    private: result.scored.filter((s) => s.state === "PRIVATE").length,
    avgScore: Math.round(
      result.scored.reduce((sum, s) => sum + s.seoScore, 0) / result.scored.length
    ),
  };

  const cache: IndexationCache = {
    generatedAt: new Date().toISOString(),
    summary,
    entities: serialised,
  };

  fs.writeFileSync(
    path.join(CACHE_DIR, "indexation-state.json"),
    JSON.stringify(cache, null, 2),
  );
}

/**
 * Read pre-computed indexation state.
 * Returns null if not yet built.
 */
export function readIndexationCache(): IndexationCache | null {
  const filePath = path.join(CACHE_DIR, "indexation-state.json");
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as IndexationCache;
  } catch {
    return null;
  }
}
