/**
 * Indexation Engine — Public API
 *
 * Barrel export. Consumers import from `@/lib/indexation`.
 */

export {
  IndexationState,
} from "./types";

export type {
  SeoSignals,
  ScoreWeights,
  IndexationThresholds,
  IndexationConfig,
  ScoredEntity,
  IndexationResult,
  SitemapEntry,
  SitemapSlice,
} from "./types";

export {
  DEFAULT_CONFIG,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
  TYPE_THRESHOLDS,
  createConfig,
  validateConfig,
  getAuthoritativeThreshold,
} from "./config";

export {
  extractSignals,
  computeSeoScore,
} from "./seo-score";

export {
  computeGraphLastMod,
  buildGraphLastModMap,
} from "./graph-lastmod";

export {
  runIndexationEngine,
  gateByScore,
} from "./indexation-engine";

export {
  scoredEntityToEntry,
  generateSitemapEntries,
  sliceSitemap,
  STATIC_ROUTES,
  SITEMAP_SLICES,
  TYPE_PRIORITY,
  TYPE_CHANGEFREQ,
} from "./sitemap-generator";
