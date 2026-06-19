/**
 * Smaže `## Tracklist` sekci z entity.mdx u alb.
 *
 * Proč: po přidání markdown tabulek do MDX parseru (commit 458b11e) se tracklist
 * u 520 alb zobrazuje 2x:
 *   1) Jako <table> z MDX (pasivní markdown)
 *   2) Jako Deezer tracklist komponenta (interaktivní — 30s mp3 preview, feat sloupce, odkazy)
 *
 * Tato utilita maže MDX variantu — Deezer komponenta zůstává jediný zdroj pravdy.
 *
 * Idempotentní — pokud `## Tracklist` v MDX není, nic nezmění.
 *
 * Usage:
 *   npx tsx scripts/strip-mdx-tracklist.ts              # všechna alba
 *   npx tsx scripts/strip-mdx-tracklist.ts --dry-run    # jen výpis
 *   npx tsx scripts/strip-mdx-tracklist.ts --slug=pouzar # konkrétní album
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugArg = args.find((a) => a.startsWith("--slug="));

const ENTITIES_DIR = path.join(process.cwd(), "content/entities");

let scanned = 0;
let stripped = 0;
let notFound = 0;
let skipped = 0;

// Regex pro "## Tracklist" až po další "## " (libovolný H2/H3) nebo EOF
const TRACKLIST_RE = /^## Tracklist\s*\n(?:(?!^## ).)*/sm;

function stripTracklistSection(mdx: string): { result: string; changed: boolean } {
  const match = mdx.match(TRACKLIST_RE);
  if (!match) return { result: mdx, changed: false };

  // Najdi začátek a konec matche
  const startIdx = match.index!;
  const endIdx = startIdx + match[0].length;

  // Smaž + očisti přebytečné prázdné řádky okolo
  let result = mdx.slice(0, startIdx) + mdx.slice(endIdx);

  // Vyčisti: pokud zbydou 3+ prázdné řádky za sebou, zredukuj na 1
  result = result.replace(/\n{3,}/g, "\n\n");

  // Pokud match končil "\n\n" (oddělovač od další sekce), výsledek by mohl
  // mít navíc prázdný řádek na konci souboru — trim
  result = result.replace(/\n+$/, "\n");

  return { result, changed: true };
}

const albumDirs = fs
  .readdirSync(ENTITIES_DIR)
  .filter((d) => d.startsWith("album_"))
  .filter((d) => !slugArg || d === `album_${slugArg.split("=")[1]}`);

for (const dir of albumDirs) {
  scanned++;
  const mdxPath = path.join(ENTITIES_DIR, dir, "entity.mdx");

  if (!fs.existsSync(mdxPath)) {
    notFound++;
    continue;
  }

  const original = fs.readFileSync(mdxPath, "utf-8");

  // Rychlý filtr — pokud ani neobsahuje "## Tracklist", skipni
  if (!original.includes("## Tracklist")) {
    skipped++;
    continue;
  }

  const { result, changed } = stripTracklistSection(original);

  if (!changed) {
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`🔍 WOULD STRIP: ${dir}`);
    stripped++;
  } else {
    fs.writeFileSync(mdxPath, result, "utf-8");
    console.log(`✅ STRIPPED: ${dir}`);
    stripped++;
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`Scanned:    ${scanned}`);
console.log(`Stripped:   ${stripped}`);
console.log(`Skipped:    ${skipped} (no ## Tracklist)`);
console.log(`NotFound:   ${notFound} (no entity.mdx)`);
if (dryRun) console.log(`(DRY RUN — no files were modified)`);