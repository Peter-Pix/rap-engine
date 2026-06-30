/**
 * Indexation Engine — Configuration
 *
 * Default scoring weights and thresholds.
 * Override via `createConfig(overrides)` for environment-specific tuning.
 */

import type { IndexationConfig } from "./types";

/** Default signal weights (sum = 100). */
export const DEFAULT_WEIGHTS: IndexationConfig["weights"] = {
  description: 15,   // meta description length
  image: 10,         // primary image exists
  faq: 5,            // FAQ / structured Q&A present
  schema: 10,        // Schema.org markup generated
  relations: 25,     // outbound edges to other entities
  backlinks: 15,     // inbound references from other entities
  content: 10,        // MDX body length
  profile: 10,        // editorial profile completeness
};

/** Default indexation thresholds. */
export const DEFAULT_THRESHOLDS: IndexationConfig["thresholds"] = {
  candidate: 20,       // ≥ this  → CANDIDATE
  indexable: 40,       // ≥ this  → INDEXABLE
  authoritative: 70,   // ≥ this  → AUTHORITATIVE (sitemap inclusion, fallback)
};

/** Per-type authoritative thresholds (sitemap inclusion).
 * Lower = more permissive (more entities in sitemap).
 * Higher = stricter (only top quality).
 * Uses DEFAULT_THRESHOLDS.authoritative as fallback for unknown types.
 */
export const TYPE_THRESHOLDS: Record<string, number> = {
  artist: 60,      // Core content — image + description + relations = OK
  album: 60,       // Core content — cover + tracks = OK
  track: 60,       // Core content
  label: 65,       // Context — need solid data
  collective: 65,  // Context
  scene: 65,       // Context
  genre: 80,       // Taxonomy — only exceptional (long content, FAQ, etc.)
  style: 80,       // Taxonomy
  theme: 80,       // Taxonomy
  mood: 80,        // Taxonomy
  location: 75,    // Location — need substantial content
  producer: 75,    // Producer — need substantial content
  article: 60,     // Content — should be well-written
  event: 60,       // Content — should be well-written
};

/** Default full configuration. */
export const DEFAULT_CONFIG: IndexationConfig = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
};

/**
 * Resolve authoritative threshold for a given entity type.
 * Core content (artist/album/track) = lower bar (60)
 * Taxonomy (genre/style/theme/mood) = higher bar (80)
 */
export function getAuthoritativeThreshold(type: string): number {
  return TYPE_THRESHOLDS[type] ?? DEFAULT_THRESHOLDS.authoritative;
}

/**
 * Create a config with optional overrides.
 * Missing keys fall back to defaults.
 */
export function createConfig(
  overrides?: Partial<IndexationConfig>,
): IndexationConfig {
  return {
    weights: { ...DEFAULT_WEIGHTS, ...overrides?.weights },
    thresholds: { ...DEFAULT_THRESHOLDS, ...overrides?.thresholds },
  };
}

/**
 * Validate that weights sum to 100 and thresholds are ordered.
 * Throws on invalid config.
 */
export function validateConfig(config: IndexationConfig): void {
  const { weights, thresholds } = config;

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 100) > 0.001) {
    throw new Error(
      `IndexationConfig: weights must sum to 100, got ${weightSum}`,
    );
  }

  if (
    !(
      thresholds.candidate < thresholds.indexable &&
      thresholds.indexable < thresholds.authoritative
    )
  ) {
    throw new Error(
      `IndexationConfig: thresholds must be ordered candidate < indexable < authoritative`,
    );
  }
}
