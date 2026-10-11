/**
 * content-guard.ts — ochrana původního obsahu před přepsáním skriptem.
 *
 * Problém (2026-10-11): generátor obohatil 8 žánrů (drill, grime, trap…) a přepsal
 * jejich ručně psaný encyklopedický text šablonou. Dvě příčiny:
 *   1. existingBodyLength() čítal DVOJITÝ frontmatter špatně (non-greedy regex
 *      matchl jen prázdný blok → délka těla vyšla špatně).
 *   2. FORCE=1 obcházel gate bez jakéhokoli varování.
 *
 * Tento modul je jediná autorita pro:
 *   - jak se pozná "skutečný obsah" entity (robustně, i s dvojitým frontmatterem)
 *   - jestli se smí entita přepsat (tvrdá pojistka)
 *
 * PRAVIDLO: Každý skript, který zapisuje entity.mdx, MUSÍ použít `mayOverwrite`
 * nebo `assertMayOverwrite` z tohoto modulu. Nikdy si nepiš vlastní gate.
 */
import fs from "node:fs";

/** Prahy pro "má entita hodnotný obsah?" */
export const MIN_KEEP_CHARS = 200; // pod tím = prázdné
export const KEEP_RICH_CHARS = 600; // nad tím = bohaté, nikdy nepřepisovat

/**
 * Vytáhne SKUTEČNÉ tělo MDX — bez VŠECH frontmatter bloků.
 *
 * Past: některé soubory mají dvojitý frontmatter:
 *   ---
 *   <prázdno>
 *   ---
 *   ---
 *   title: "..."
 *   ---
 *   <tělo>
 * Non-greedy regex `^---[\s\S]*?---` matchne jen první prázdný blok a zbytek
 * (včetně druhého frontmatteru) se pak počítá jako "tělo" → falešně velké.
 */
export function extractBody(raw: string): string {
  let s = raw.replace(/^\uFEFF/, "");
  for (let i = 0; i < 6; i++) {
    const m = s.match(/^\s*---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/);
    if (!m) break;
    const rest = s.slice(m[0].length);
    // Následuje další frontmatter blok? Pak pokračuj.
    if (/^\s*---\r?\n/.test(rest)) {
      s = rest.trimStart();
      continue;
    }
    s = rest;
    break;
  }
  return s;
}

/** Skutečná délka textu bez frontmatteru, nadpisů a HTML komentářů. */
export function realContentLength(raw: string): number {
  const body = extractBody(raw);
  return body
    .replace(/<!--[\s\S]*?-->/g, "")   // HTML komentáře (např. <!-- Stub entity created -->)
    .replace(/^#+\s.*$/gm, "")         // markdown nadpisy
    .replace(/^>\s.*$/gm, "")          // blockquote/citace v hlavičce
    .replace(/\s+/g, " ")
    .trim().length;
}

/** Přečte entitu a vrátí skutečnou délku obsahu (0 když soubor neexistuje). */
export function existingContentLength(entitiesDir: string, id: string): number {
  const p = `${entitiesDir}/${id}/entity.mdx`;
  if (!fs.existsSync(p)) return 0;
  return realContentLength(fs.readFileSync(p, "utf8"));
}

export type OverwriteReason = "empty" | "forced" | "too-rich";

export interface OverwriteDecision {
  allowed: boolean;
  reason: OverwriteReason;
  currentLength: number;
  needsConfirmation: boolean;
  message: string;
}

/**
 * Smí se entita přepsat?
 *
 * @param entitiesDir  absolutní cesta k content/entities
 * @param id            id entity (např. "genre_drill")
 * @param force         uživatel předal FORCE=1 (přepíše i střední obsah)
 * @param allowRich     skript explicitně dovoluje přepsat bohatý obsah
 * @param confirmed     uživatel potvrdil I_KNOW_WHAT_I_DO=1
 */
export function mayOverwrite(
  entitiesDir: string,
  id: string,
  { force = false, allowRich = false, confirmed = false }: { force?: boolean; allowRich?: boolean; confirmed?: boolean } = {},
): OverwriteDecision {
  const len = existingContentLength(entitiesDir, id);

  // 1) Entita nemá obsah → volno
  if (len < MIN_KEEP_CHARS) {
    return { allowed: true, reason: "empty", currentLength: len, needsConfirmation: false,
      message: `${id}: prázdné (${len} B) → lze generovat` };
  }

  // 2) Bohatý obsah → NIKDY bez explicitního allowRich + potvrzení
  if (len >= KEEP_RICH_CHARS) {
    if (allowRich && confirmed) {
      return { allowed: true, reason: "too-rich", currentLength: len, needsConfirmation: false,
        message: `${id}: BOHATÝ obsah (${len} B) → přepsán s explicitním potvrzením` };
    }
    return { allowed: false, reason: "too-rich", currentLength: len, needsConfirmation: true,
      message: `${id}: BOHATÝ obsah (${len} B) → CHRÁNĚNO (nutné ALLOW_RICH=1 I_KNOW_WHAT_I_DO=1)` };
  }

  // 3) Střední obsah (200-600 B)
  if (force && confirmed) {
    return { allowed: true, reason: "forced", currentLength: len, needsConfirmation: false,
      message: `${id}: má obsah (${len} B) → přepsán FORCE + potvrzení` };
  }
  if (force) {
    return { allowed: false, reason: "forced", currentLength: len, needsConfirmation: true,
      message: `${id}: má obsah (${len} B). FORCE sám nestačí — nutné I_KNOW_WHAT_I_DO=1` };
  }
  return { allowed: false, reason: "empty", currentLength: len, needsConfirmation: false,
    message: `${id}: má obsah (${len} B) → přeskočeno` };
}

/** Vyhodí chybu, pokud se entita nesmí přepsat. Pro použití v generátorech. */
export function assertMayOverwrite(
  entitiesDir: string,
  id: string,
  opts: { force?: boolean; allowRich?: boolean; confirmed?: boolean } = {},
): void {
  const d = mayOverwrite(entitiesDir, id, opts);
  if (d.allowed) return;
  throw new Error(`[content-guard] ODMTNUTO PŘEPSAT — ${d.message}`);
}
