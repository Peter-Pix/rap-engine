/**
 * Migration: `styles` pole v relations.json obsahuje reference na `genre_*` entity.
 *
 * Problém:
 *   V editoru relations.json autoři psali `styles: ["drill", "grime", ...]`, které
 *   se resolvují na `genre_drill`, `genre_grime`. Ale registr říká, že
 *   `HAS_STYLE` vyžaduje target type `style`. Výsledkem je 287+ validation errors.
 *
 * Fix:
 *   Přesunout všechny `genre_*` reference z `styles` do deduplikovaného `genres`
 *   pole. Ostatní typy v `styles` (scene, mood, theme, album) vyhodit —
 *   jsou to nekorektní reference. Dangling (neexistující) reference taky vyhodit.
 *
 * Idempotentní: pokud `genres` pole už má ty samé slugs, nic se neděje.
 *
 * Co NEřeší (vědomě, scope creep):
 *   - `themes → location` violations (14) — opravit na úrovni dat,
 *     tady je každý případ specifický
 *   - DANGLING jinde (auth, regional, non-ivot, ...) — chybějící entity,
 *     řešit přes entity creator
 *   - EMPTY MDX u locations — popis je v meta.json, MDX je volitelný
 *
 * Usage:
 *   npx tsx scripts/migrate-relations-styles-to-genres.ts           # provede
 *   npx tsx scripts/migrate-relations-styles-to-genres.ts --dry-run # ukáže co udělá
 */

import fs from "node:fs";
import path from "node:path";
import { readEntities } from "../src/lib/content/cache-reader";

// ── Setup ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const ENTITIES_DIR = path.join(process.cwd(), "content", "entities");
const entities = readEntities() ?? {};

// Map slug → entity id (řeší jak "drill" → "genre_drill" tak i přímé ID)
const slugToId: Record<string, string> = {};
for (const e of Object.values(entities)) {
  if (!e.slug) continue;
  slugToId[e.slug] = e.id;
  // taky podle entity id pro případ, že je v relations.json přímo "genre_drill"
  slugToId[e.id] = e.id;
}

function resolveTargetType(slug: string): string | null {
  const id = slugToId[slug];
  if (!id) return null;
  return entities[id]?.type ?? null;
}

// ── Stats ───────────────────────────────────────────────────────────────

let filesScanned = 0;
let filesModified = 0;
let swappedGenres = 0; // přesunuto z styles → genres
let removedDangling = 0; // dangling v styles odstraněno
let removedWrongType = 0; // scene/mood/theme/album v styles odstraněno
let alreadyHadGenres = 0; // genres pole již existovalo (počet souborů)

const swapsByType: Record<string, number> = {};
const warnings: string[] = [];

// ── Main loop ───────────────────────────────────────────────────────────

const dirs = fs.readdirSync(ENTITIES_DIR);
for (const dir of dirs) {
  const relPath = path.join(ENTITIES_DIR, dir, "relations.json");
  if (!fs.existsSync(relPath)) continue;
  filesScanned++;

  const rel = JSON.parse(fs.readFileSync(relPath, "utf-8"));
  if (!Array.isArray(rel.styles) || rel.styles.length === 0) continue;

  const newStyles: string[] = [];
  const newGenres: string[] = [];
  let fileModified = false;
  const fileSwaps: Array<{ from: string; action: string; to?: string }> = [];

  for (const slug of rel.styles) {
    const type = resolveTargetType(slug);

    if (type === "genre") {
      // Přesunout do genres
      newGenres.push(slug);
      swappedGenres++;
      swapsByType[slug] = (swapsByType[slug] || 0) + 1;
      fileModified = true;
      fileSwaps.push({ from: slug, action: "→ genres" });
    } else if (type === "style") {
      // Správně v styles, ponech
      newStyles.push(slug);
    } else if (type === null) {
      // Dangling — vyhodit (entry chybí v cache)
      removedDangling++;
      fileModified = true;
      fileSwaps.push({ from: slug, action: "REMOVED (dangling)" });
    } else {
      // Špatný typ (scene/mood/theme/album) — vyhodit + warning
      removedWrongType++;
      fileModified = true;
      fileSwaps.push({ from: slug, action: `REMOVED (wrong type: ${type})` });
      warnings.push(`${dir}: styles contains "${slug}" of type "${type}"`);
    }
  }

  // Merge s existujícím `genres` polem (pokud existuje), dedup
  if (Array.isArray(rel.genres)) {
    alreadyHadGenres++;
    for (const g of rel.genres) {
      if (!newGenres.includes(g)) newGenres.push(g);
    }
  } else {
    rel.genres = [];
  }

  // Pokud byly nějaké přesuny, přidej na začátek genres (ať je to vidět)
  rel.genres = Array.from(new Set([...newGenres, ...rel.genres.filter((g: string) => !newGenres.includes(g))]));
  rel.styles = newStyles;

  if (fileModified) {
    filesModified++;
    if (!dryRun) {
      fs.writeFileSync(relPath, JSON.stringify(rel, null, 2) + "\n", "utf-8");
    }
  }
}

// ── Output ──────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log(" Migration: styles → genres (auto-fix for HAS_STYLE)");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Files scanned:   ${filesScanned}`);
console.log(`Files modified:  ${filesModified}${dryRun ? " (DRY RUN)" : ""}`);
console.log(`Files with existing genres: ${alreadyHadGenres}`);
console.log("");
console.log("Changes:");
console.log(`  Swapped (styles → genres): ${swappedGenres}`);
console.log(`  Removed (dangling):        ${removedDangling}`);
console.log(`  Removed (wrong type):      ${removedWrongType}`);
console.log("");
console.log("Top 10 most-swapped genres:");
Object.entries(swapsByType)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([slug, n]) => console.log(`  ${slug} × ${n}`));

if (warnings.length > 0) {
  console.log("");
  console.log(`⚠️  Warnings (wrong-type references in styles): ${warnings.length}`);
  warnings.slice(0, 10).forEach((w) => console.log(`  ${w}`));
  if (warnings.length > 10) console.log(`  ... and ${warnings.length - 10} more`);
}

if (dryRun) {
  console.log("");
  console.log("(DRY RUN — no files were modified. Run without --dry-run to apply.)");
}
