/**
 * Indexation Engine — SEO Score
 *
 * Deterministic scoring (0–100) based on extractable signals.
 * No AI, no heuristics, no randomness.
 */

import type { CacheEntity, CacheEntities, CacheInbound } from "@/lib/content/cache-builder";
import type {
  SeoSignals,
  ScoreWeights,
} from "./types";

// ─── Signal Extraction ──────────────────────────────────────────────────

/**
 * Extract raw signals from a single entity.
 * Pure function — same input → same output.
 */
export function extractSignals(
  entity: CacheEntity,
  inbound: string[],
): SeoSignals {
  const content = entity.content ?? "";

  return {
    descriptionLength: entity.description?.length ?? 0,
    hasImage: !!(entity.image || (entity as any).extraMeta?.profileImageUrl),
    hasFaq: detectFaq(content),
    hasSchema: detectSchema(entity),
    relationCount: countRelations(entity),
    backlinkCount: inbound.length,
    contentLength: content.length,
    profileCompleteness: computeProfileCompleteness(entity),
  };
}

function detectFaq(content: string): boolean {
  // Look for <script type="application/ld+json"> containing FAQPage or
  // Markdown FAQ pattern: "### FAQ" / "## Časté otázky" / "## FAQ"
  if (!content) return false;
  const ldJson = content.includes('"@type": "FAQPage"') ||
                 content.includes('"@type":"FAQPage"');
  const markdown = /#{2,3}\s*(FAQ|[Čč]ast[ée]\s+ot[áa]zky)/i.test(content);
  return ldJson || markdown;
}

function detectSchema(entity: CacheEntity): boolean {
  // Schema.org JSON-LD is generated at build time for most entity types.
  // For the purpose of scoring, we consider schema "present" if:
  // 1. The entity is not a stub, or
  // 2. The entity type is one that always gets schema markup
  const isStub = (entity as any).extraMeta?.isStub === true;
  const isDraft = (entity as any).extraMeta?.status === "draft";
  return !isStub && !isDraft;
}

function countRelations(entity: CacheEntity): number {
  const outbound = entity.outbound ?? {};
  let count = 0;
  for (const targets of Object.values(outbound)) {
    if (Array.isArray(targets)) count += targets.length;
  }
  return count;
}

function computeProfileCompleteness(entity: CacheEntity): number {
  const profile = entity.profile;
  if (!profile || typeof profile !== "object") return 0;

  const fields: (keyof typeof profile)[] = [
    "shortIntro",
    "whatMakesUnique",
    "careerSummary",
    "superpower",
    "oneLiner",
    "influence",
    "controversy",
    "generationContext",
    "styleTags",
    "themes",
    "keyAlbums",
    "keyTracks",
    "similarArtists",
    "funFacts",
    "sources",
  ];

  let filled = 0;
  for (const key of fields) {
    const value = profile[key];
    if (value == null) continue;
    if (Array.isArray(value) && value.length > 0) {
      filled++;
    } else if (typeof value === "string" && value.length > 0) {
      filled++;
    }
  }

  return Math.round((filled / fields.length) * 100);
}

// ─── Scoring ────────────────────────────────────────────────────────────

/**
 * Compute a deterministic SEO score (0–100) from signals and weights.
 *
 * Each signal is normalised to 0–1, multiplied by its weight, summed,
 * then rounded to the nearest integer.
 */
export function computeSeoScore(
  signals: SeoSignals,
  weights: ScoreWeights,
): number {
  // Normalise each signal to 0–1
  const descNorm = Math.min(signals.descriptionLength / 160, 1); // 160 chars = ideal meta desc
  const imgNorm = signals.hasImage ? 1 : 0;
  const faqNorm = signals.hasFaq ? 1 : 0;
  const schemaNorm = signals.hasSchema ? 1 : 0;
  const relNorm = Math.min(signals.relationCount / 10, 1); // 10+ relations = full
  const backNorm = Math.min(signals.backlinkCount / 5, 1); // 5+ backlinks = full
  const contentNorm = Math.min(signals.contentLength / 2000, 1); // 2000 chars = full
  const profileNorm = signals.profileCompleteness / 100;

  // Weighted sum
  const raw =
    descNorm * weights.description +
    imgNorm * weights.image +
    faqNorm * weights.faq +
    schemaNorm * weights.schema +
    relNorm * weights.relations +
    backNorm * weights.backlinks +
    contentNorm * weights.content +
    profileNorm * weights.profile;

  // Clamp and round
  return Math.min(100, Math.max(0, Math.round(raw)));
}
