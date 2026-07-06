/**
 * Label resolver — prevents duplicate label entity creation.
 *
 * Problem: import pipelines receive raw label strings like
 *   "Blakkwood Records Bval", "Rychlí kluci / Warner Music",
 *   "Virgin Music / Universal Music Group" — and create stubs.
 *
 * Solution:
 *   1. Extract primary label (strip after / + ( etc.)
 *   2. Normalize (lowercase, remove diacritics, collapse whitespace)
 *   3. Match against known aliases → canonical ID
 *   4. Fallback to fuzzy match against existing label entities
 *
 * Usage:
 *   const labelId = resolveLabel("Blakkwood Records Bval");
 *   // → "label_blakkwood-records"
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── Configuration ──────────────────────────────────────────────────────

const CONTENT_DIR = path.resolve(process.cwd(), "content", "entities");

// Known bad label strings → canonical entity ID
// Add new entries as duplicates are discovered.
export const LABEL_ALIASES: Record<string, string> = {
  // Blakkwood variants
  "blakkwood records bval": "label_blakkwood-records",
  "blakkwood vlastn": "label_blakkwood-records",
  "blakkwood records vlastn": "label_blakkwood-records",
  "blakkwood": "label_blakkwood-records",

  // Rychlí kluci variants
  "rychl kluci warner music": "label_rychli-kluci",
  "rychl kluci": "label_rychli-kluci",
  "rychli kluci": "label_rychli-kluci",

  // Ty Nikdy variants
  "ty nikdy label": "label_ty-nikdy",
  "ty nikdy records": "label_ty-nikdy",
  "ty nikdy tycho agency": "label_ty-nikdy",
  "ty nikdy": "label_ty-nikdy",

  // Universal Music variants
  "virgin music universal music group": "label_universal-music",
  "universal music fource entertainment": "label_universal-music",
  "virgin music": "label_universal-music",
  "fource entertainment": "label_universal-music",

  // DMS variants
  "dms records": "label_dms",
  "dms": "label_dms",

  // Spirit Music
  "spirit music label independent": "label_spirit-music-label",
  "spirit music label": "label_spirit-music-label",
  "spirit music": "label_spirit-music-label",

  // Mike Roft
  "mike roft records": "label_mike-roft",
  "mike roft": "label_mike-roft",

  // 415 02
  "415 02 records ftw for the win": "label_415-02-records",
  "415 02 records ftw": "label_415-02-records",

  // Golden Touch
  "golden touch records": "label_golden-touch",
  "golden touch": "label_golden-touch",

  // Krimi Dawgz
  "krimi dawgz virgin music universal music group": "label_krimi-dawgz",
  "krimi dawgz virgin music": "label_krimi-dawgz",

  // TroubleGang
  "troublegang records": "label_troublegang",

  // WeLoveVerySimple
  "weloveverysimple": "label_weloveverysimple",

  // Kuffenheim Sound
  "kuffenheim sound": "label_kuffenheim-sound",

  // Overgroundart
  "overgroundart": "label_overgroundart",

  // Tino Entertainment
  "tino entertainment def jam recordings slovakia": "label_tino-entertainment",
  "tino entertainment": "label_tino-entertainment",

  // White Trash
  "white trash": "label_white-trash",

  // Gajlo Records
  "gajlo records": "label_gajlo-records",
  "gajlo": "label_gajlo-records",

  // Die Mannschaft (strip compound)
  "die mannschaft dvojlitrboyzz": "label_die-mannschaft",

  // Fast Food
  "fast food records x production": "label_fast-food-records",

  // Ruka Hore
  "ruka hore": "label_ruka-hore",

  // Championship Music
  "championship music": "label_championship-music",

  // Iced Out
  "iced out gang": "label_iced-out",
  "iced out": "label_iced-out",

  // Chef Squad
  "chef squad": "label_chef-squad",

  // Addict Sound
  "addict sound": "label_addict-sound",

  // Blinddeaf
  "blinddeaf": "label_blinddeaf",

  // PVP
  "pvp label": "label_pvp-label",

  // Lavutaris
  "lavutaris records": "label_lavutaris-records",

  // Illegal Music
  "illegal music": "label_illegal-music",

  // 600ENT
  "600ent": "label_600ent",

  // Archetyp 51
  "archetyp 51": "label_archetyp-51",

  // BPM
  "bpm basnici pred mikrofonem": "label_bpm",
  "bpm": "label_bpm",

  // Jebem tvoji mmu
  "jebem tvoji mmu jtm": "label_jebem-tvoji-mmu",

  // Dvojlitrboyzz
  "dvojlitrboyzz": "label_dvojlitrboyzz",

  // Dogma Family
  "dogma family": "label_dogma-family",

  // ZNK
  "znk zivot neni krasny": "label_znk",
  "znk zkurveny nez": "label_znk",
  "znk": "label_znk",
};

// ─── Normalization ────────────────────────────────────────────────────────

/**
 * Normalize a string for comparison:
 * - lowercase
 * - remove diacritics
 * - replace non-alphanumeric with single space
 * - trim
 */
export function normalizeLabelName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Extract the primary label from a compound string.
 * Splits on common separators and returns the first meaningful part.
 */
export function extractPrimaryLabel(name: string): string {
  // Split on common separators: / + & ( [ feat. ft. x
  const parts = name.split(/\s*[\/\+\&\(\[\,]\s*/);
  const first = parts[0]?.trim();
  if (!first) return name.trim();

  // Also strip common suffixes like "Records", "Label", "Entertainment"
  // but only if it would leave a meaningful name
  const stripped = first
    .replace(/\s+(records|label|entertainment|music group|vydavatelství|vydavatelstvi)$/i, "")
    .trim();

  return stripped || first;
}

// ─── Existing label cache ─────────────────────────────────────────────────

let existingLabelsCache: Map<string, string> | null = null;

function loadExistingLabels(): Map<string, string> {
  if (existingLabelsCache) return existingLabelsCache;

  const map = new Map<string, string>();
  if (!fs.existsSync(CONTENT_DIR)) {
    existingLabelsCache = map;
    return map;
  }

  const dirs = fs.readdirSync(CONTENT_DIR).filter((d) => d.startsWith("label_"));
  for (const dir of dirs) {
    const metaPath = path.join(CONTENT_DIR, dir, "meta.json");
    if (!fs.existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      const title = meta.title || meta.label || "";
      const id = meta.id || dir;
      // Store multiple normalized forms
      map.set(normalizeLabelName(title), id);
      map.set(normalizeLabelName(extractPrimaryLabel(title)), id);
      map.set(normalizeLabelName(dir.replace("label_", "").replace(/-/g, " ")), id);
    } catch {
      // ignore parse errors
    }
  }

  existingLabelsCache = map;
  return map;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Resolve a raw label string to a canonical label entity ID.
 * Returns null if no match found (caller should create new entity).
 */
export function resolveLabel(labelName: string): string | null {
  if (!labelName || typeof labelName !== "string") return null;

  const normalized = normalizeLabelName(labelName);

  // 1. Direct alias lookup
  if (LABEL_ALIASES[normalized]) {
    return LABEL_ALIASES[normalized];
  }

  // 2. Try primary label extraction
  const primary = normalizeLabelName(extractPrimaryLabel(labelName));
  if (LABEL_ALIASES[primary]) {
    return LABEL_ALIASES[primary];
  }

  // 3. Match against existing label entities
  const existing = loadExistingLabels();
  if (existing.has(normalized)) {
    return existing.get(normalized)!;
  }
  if (existing.has(primary)) {
    return existing.get(primary)!;
  }

  // 4. Try fuzzy: check if any existing label is a substring
  for (const [existingNorm, id] of existing.entries()) {
    // Check if one contains the other (bidirectional)
    if (normalized.includes(existingNorm) || existingNorm.includes(normalized)) {
      // But require meaningful overlap (not just single words)
      const normalizedWords = normalized.split(/\s+/).filter((w) => w.length > 2);
      const existingWords = existingNorm.split(/\s+/).filter((w) => w.length > 2);
      const commonWords = normalizedWords.filter((w) => existingWords.includes(w));
      if (commonWords.length >= Math.min(2, Math.min(normalizedWords.length, existingWords.length))) {
        return id;
      }
    }
  }

  return null;
}

/**
 * Resolve a raw label string, returning canonical ID.
 * If no match, creates a safe fallback slug.
 * Use this in import scripts instead of direct slugify.
 */
export function resolveLabelOrCreate(labelName: string): { id: string; isNew: boolean } {
  const resolved = resolveLabel(labelName);
  if (resolved) {
    return { id: resolved, isNew: false };
  }

  // Create safe slug from primary label
  const primary = extractPrimaryLabel(labelName);
  const slug = primary
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return { id: `label_${slug}`, isNew: true };
}

/**
 * Invalidate the existing labels cache.
 * Call this after creating new label entities.
 */
export function invalidateLabelCache(): void {
  existingLabelsCache = null;
}
