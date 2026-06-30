/**
 * Indexation Engine — Core
 *
 * Entry point: analyse all entities and produce scored results.
 *
 * Flow:
 *   CacheEntities ──▶ extractSignals ──▶ computeSeoScore ──▶ resolveState
 *         │                                                  │
 *         └──────────▶ computeGraphLastMod ◀─────────────────┘
 *
 * Deterministic. No AI. No randomness.
 */

import type { CacheEntities, CacheInbound, CacheEntity } from "@/lib/content/cache-builder";
import type {
  IndexationConfig,
  ScoredEntity,
  IndexationResult,
} from "./types";
import { IndexationState } from "./types";
import { extractSignals, computeSeoScore } from "./seo-score";
import { computeGraphLastMod } from "./graph-lastmod";
import { DEFAULT_CONFIG, validateConfig, getAuthoritativeThreshold } from "./config";

// ─── Resolve IndexationState from score + entity flags ───────────────────

function resolveState(
  score: number,
  entity: CacheEntity,
): IndexationState {
  const extraMeta = entity.extraMeta ?? {};
  const isStub = extraMeta.isStub === true;
  const isDraft = extraMeta.status === "draft";
  const forceNoindex = extraMeta.noindex === true;

  // Hard overrides (editorial / manual)
  if (isDraft) return IndexationState.DRAFT;
  if (forceNoindex) return IndexationState.NOINDEX;
  if (isStub) return IndexationState.NOINDEX;
  // Private flag (future use)
  if (extraMeta.private === true) return IndexationState.PRIVATE;

  // Score-based gates with per-type authoritative threshold
  const authThreshold = getAuthoritativeThreshold(entity.type);
  return gateByScore(score, DEFAULT_CONFIG.thresholds, authThreshold);
}

/**
 * Convert a score into an IndexationState using configured thresholds.
 * Supports per-type authoritative threshold (e.g. artist=60, genre=80).
 * Separated for unit-testability.
 */
export function gateByScore(
  score: number,
  thresholds: IndexationConfig["thresholds"] = DEFAULT_CONFIG.thresholds,
  authoritativeOverride?: number,
): IndexationState {
  const authoritative = authoritativeOverride ?? thresholds.authoritative;
  if (score < thresholds.candidate) return IndexationState.NOINDEX;
  if (score < thresholds.indexable) return IndexationState.CANDIDATE;
  if (score < authoritative) return IndexationState.INDEXABLE;
  return IndexationState.AUTHORITATIVE;
}

// ─── Main Engine ────────────────────────────────────────────────────────

/**
 * Analyse every entity and return scored + filtered results.
 *
 * @param entities   Full cache map (entities.json)
 * @param inbound    Backlinks map (inbound.json)
 * @param config     Optional custom config (defaults provided)
 */
export function runIndexationEngine(
  entities: CacheEntities,
  inbound: CacheInbound,
  config: Partial<IndexationConfig> = {},
): IndexationResult {
  const fullConfig: IndexationConfig = {
    weights: { ...DEFAULT_CONFIG.weights, ...config.weights },
    thresholds: { ...DEFAULT_CONFIG.thresholds, ...config.thresholds },
  };

  validateConfig(fullConfig);

  const scored: ScoredEntity[] = [];

  for (const [id, entity] of Object.entries(entities)) {
    if (!entity || !entity.type || !entity.slug) continue;

    const inboundIds = inbound[id] ?? [];
    const signals = extractSignals(entity, inboundIds);
    const seoScore = computeSeoScore(signals, fullConfig.weights);
    const state = resolveState(seoScore, entity);
    const graphUpdatedAt = computeGraphLastMod(entity, entities);

    scored.push({
      entity,
      signals,
      seoScore,
      state,
      graphUpdatedAt,
    });
  }

  // Deterministic sort — stable output for diffing
  scored.sort((a, b) => {
    const typeCmp = a.entity.type.localeCompare(b.entity.type);
    if (typeCmp !== 0) return typeCmp;
    return a.entity.slug.localeCompare(b.entity.slug);
  });

  return {
    scored,
    sitemapEntities: scored.filter((s) => s.state === IndexationState.AUTHORITATIVE),
    indexableEntities: scored.filter((s) => s.state >= IndexationState.INDEXABLE),
    noindexEntities: scored.filter((s) => s.state < IndexationState.CANDIDATE),
  };
}

// CacheEntity imported above — no workaround needed
