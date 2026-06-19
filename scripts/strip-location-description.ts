/**
 * Odstraní duplicitní description z MDX u location entit.
 *
 * Problém: 48 location entit má v entity.mdx první H1 + description, která
 * se už zobrazuje v hero (z meta.json). Výsledek: description na stránce 2x.
 *
 * Logika:
 *   1) Načti meta.json
 *   2) Pokud má description (non-empty)
 *   3) Pokud MDX obsahuje "# Title" + description jako první řádek (za H1)
 *   4) Smaž ten blok (H1 + description)
 *   5) Vyčisti prázdné řádky
 *
 * Idempotentní — pokud description v MDX není, nic nezmění.
 *
 * Usage:
 *   npx tsx scripts/strip-location-description.ts [--dry-run] [--slug=X]
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugArg = args.find((a) => a.startsWith("--slug="));
const filterSlug = slugArg ? slugArg.split("=")[1] : null;

const ENTITIES_DIR = path.join(process.cwd(), "content/entities");

let scanned = 0;
let fixed = 0;
let skipped = 0;

const dirs = fs
  .readdirSync(ENTITIES_DIR)
  .filter((d) => d.startsWith("location_"))
  .filter((d) => !filterSlug || d === `location_${filterSlug}`);

for (const dir of dirs) {
  scanned++;
  const mdxPath = path.join(ENTITIES_DIR, dir, "entity.mdx");
  const metaPath = path.join(ENTITIES_DIR, dir, "meta.json");

  if (!fs.existsSync(mdxPath) || !fs.existsSync(metaPath)) {
    skipped++;
    continue;
  }

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch {
    skipped++;
    continue;
  }

  const description = (meta.description as string | undefined)?.trim();
  if (!description) {
    skipped++;
    continue;
  }

  let mdx = fs.readFileSync(mdxPath, "utf-8");

  // Najdi frontmatter
  const fmMatch = mdx.match(/^---\n[\s\S]*?\n---\n?/);
  if (!fmMatch) {
    skipped++;
    continue;
  }

  const body = mdx.slice(fmMatch[0].length);
  const fm = fmMatch[0];

  // Ověř že description se vyskytuje v MDX těle
  if (!body.includes(description)) {
    skipped++;
    continue;
  }

  // Strategie 1: Smaž "## " nebo "# " nadpis hned následovaný description
  // Hledáme "# Title\n\nDescription" nebo "## Title\n\nDescription"
  const title = (meta.title as string | undefined)?.trim();
  const lines = body.split("\n");
  let toRemoveEnd = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // První H1/H2 s titulem
    if ((line === `# ${title}` || line === `## ${title}`) && title) {
      // Shromáždi následující řádky co tvoří description
      const afterHeading: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        if (nextLine.startsWith("#") || nextLine.startsWith("---") || nextLine === "***") break;
        afterHeading.push(lines[j]);
        // Pokud už máme celý description
        const joined = afterHeading.join(" ").trim();
        if (joined.includes(description)) {
          toRemoveEnd = j + 1;
          break;
        }
      }
      break;
    }
  }

  if (toRemoveEnd === 0) {
    skipped++;
    continue;
  }

  // Smaž řádky [0, toRemoveEnd) z body
  const newBody = [
    ...lines.slice(0, 0), // smaž od začátku (heading + description)
    ...lines.slice(toRemoveEnd),
  ].join("\n");

  // Vyčisti prázdné řádky
  let cleanedBody = newBody.replace(/\n{3,}/g, "\n\n");

  const newMdx = fm + cleanedBody;

  if (newMdx === mdx) {
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`🔍 WOULD FIX: ${dir}`);
    fixed++;
  } else {
    fs.writeFileSync(mdxPath, newMdx, "utf-8");
    console.log(`✅ FIXED: ${dir}`);
    fixed++;
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`Scanned:  ${scanned}`);
console.log(`Fixed:    ${fixed}`);
console.log(`Skipped:  ${skipped} (no duplicate)`);
if (dryRun) console.log(`(DRY RUN — no files were modified)`);