// ═══════════════════════════════════════════════════════════════
// VRSTVA 4 — Post-validace odpovědi
//
// Toto je VYNUCENÍ "nula halucinací". Po vygenerování odpovědi
// zkontrolujeme, že LLM nezmínila nic, co není ve whitelistu.
//
// Princip: každé vlastní jméno / každá URL v odpovědi musí
// existovat v našem KG. Pokud ne → violation → retry / fallback.
// ═══════════════════════════════════════════════════════════════

import type { CacheEntities } from "@/lib/content/cache-builder";
import type { GroundingContext, ValidationResult } from "./types";
import { normalizeText } from "./entity-resolver";

/** Slova, která jsou legitimní i bez entity (obecná čeština, hudební termíny). */
// POZOR: porovnává se přes normalizeText() → položky musí být BEZ diakritiky.
const ALLOWED_COMMON = new Set([
  "rap", "trap", "hip", "hop", "hip-hop", "rnb", "r b", "pop", "soul",
  "afrobeats", "drill", "grime", "cloud", "underground", "mainstream",
  "album", "skladba", "track", "singl", "ep", "mixtape", "label",
  "cesko", "slovensko", "praha", "bratislava", "brno", "ostrava",
  "producent", "beatmaker", "mixing", "mastering", "text", "beat",
  "rapper", "raper", "interpret", "umelec", "skupina", "kolektiv",
  "tema", "nalada", "zanr", "styl", "scena", "zpevak", "produkce",
  "ano", "ne", "podle", "databaze", "informace", "kontext", "zdroj",
  "skladeb", "skladeb", "hostovani", "spoluprace", "nejcasteji",
]);

/** Hudební / obecné termíny, které se nesmí hlásit jako halucinace. */
function isCommonWord(w: string): boolean {
  const n = normalizeText(w);
  return ALLOWED_COMMON.has(n) || n.length <= 2;
}

/**
 * Ověří odpověď LLM.
 *
 * Kontroly:
 *  1. Každá markdown URL musí být ve whitelistu.
 *  2. Každá entita zmíněná v tvaru [Název](/cesta) musí být ve whitelistu.
 *  3. Boldované názvy (**X**) — pokud vypadají jako vlastní jméno a nejsou
 *     ve whitelistu ani běžné slovo → podezření na halucinaci.
 */
export function validateAnswer(
  answer: string,
  ctx: GroundingContext,
  entities: CacheEntities,
): ValidationResult {
  const violations: string[] = [];

  // Whitelist titulů (normalizovaně) pro porovnání jmen
  const allowedTitles = new Set<string>();
  for (const id of ctx.allowedIds) {
    const e = entities[id];
    if (e?.title) allowedTitles.add(normalizeText(e.title));
  }

  // ── 1) Markdown odkazy [text](url) ──────────────────────────────────────
  for (const m of answer.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    const [, label, url] = m;
    if (url.startsWith("http")) continue; // externí odkazy neřešíme
    if (!ctx.allowedUrls.has(url)) {
      violations.push(`odkaz mimo databázi: ${url} (${label})`);
    }
  }

  // ── 2) Holé URL v textu ─────────────────────────────────────────────────
  for (const m of answer.matchAll(/(?:^|\s)(\/[a-z-]+\/[a-z0-9-]+)/g)) {
    const url = m[1];
    if (!ctx.allowedUrls.has(url)) {
      violations.push(`URL mimo databázi: ${url}`);
    }
  }

  // ── 3) Boldované názvy — kontrola proti whitelistu ─────────────────────
  for (const m of answer.matchAll(/\*\*([^*]{2,60})\*\*/g)) {
    const raw = m[1].replace(/[„""'']/g, "").trim();
    if (!raw || isCommonWord(raw)) continue;
    // Vlastní jméno: začíná velkým písmenem nebo číslicí, max 5 slov
    const words = raw.split(/\s+/);
    if (words.length > 5) continue;
    // Musí začínat VELKÝM PÍSMENEM (ne číslicí) — "89 vlastních skladeb" není entita.
    if (!/^[A-ZÁ-Ž]/.test(raw)) continue;
    // Pokud je to převážně číselný/hodnotový výraz (např. "2×", "1 hostování"), přeskoč.
    if (/^\d/.test(raw) || /^\d+\s/.test(raw)) continue;

    const n = normalizeText(raw);
    if (allowedTitles.has(n)) continue;
    // Zkus i částečnou shodu (např. "Majk Spirit" vs "Majk Spirit (rapper)")
    let found = false;
    for (const t of allowedTitles) {
      if (t === n || t.includes(n) || n.includes(t)) { found = true; break; }
    }
    if (found) continue;

    // Poslední záchrana: pokud jsou VŠECHNA slova běžná (ne vlastní jména) → není entita.
    // "vlastních skladeb", "hostování v cizích skladbách" apod.
    const allWordsCommon = words.every((w) => isCommonWord(w) || /^\d/.test(w));
    if (allWordsCommon) continue;

    violations.push(`pravděpodobně vymyšlená entita: "${raw}"`);
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Whitelist pro ruční kontrolu v testech.
 */
export function buildAllowedTitles(ctx: GroundingContext, entities: CacheEntities): Set<string> {
  const s = new Set<string>();
  for (const id of ctx.allowedIds) {
    const e = entities[id];
    if (e?.title) s.add(e.title);
  }
  return s;
}
