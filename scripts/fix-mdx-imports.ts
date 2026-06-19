/**
 * Odstraní mrtvé `import { ... } from "@/components/mdx";` řádky z MDX entit.
 *
 * Proč: AI generátor MDX (4rap enrichment script) vkládal import statementy
 * `import { EntityLink } from "@/components/mdx";` na začátek entity.mdx —
 * ale ten soubor vůbec neexistuje, takže to byl jen plain text v renderu.
 *
 * Render to nyní zobrazuje jako <p>import { EntityLink } from "...";</p>
 * což vypadá jako chyba.
 *
 * Idempotentní — pokud import chybí, nic nezmění.
 *
 * Usage:
 *   npx tsx scripts/fix-mdx-imports.ts              # všechna MDX
 *   npx tsx scripts/fix-mdx-imports.ts --dry-run    # výpis
 *   npx tsx scripts/fix-mdx-imports.ts --type=artist # jen určitý typ
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const typeArg = args.find((a) => a.startsWith("--type="));
const filterType = typeArg ? typeArg.split("=")[1] : null;

const ENTITIES_DIR = path.join(process.cwd(), "content/entities");

// Regex — chytí "import { ... } from \"...\";" na samostatném řádku
const IMPORT_RE = /^[ \t]*import\s+\{[^}]*\}\s+from\s+["'][^"']+["']\s*;?[ \t]*\n/gm;

let scanned = 0;
let fixed = 0;
let skipped = 0;
let noMdx = 0;

const dirs = fs.readdirSync(ENTITIES_DIR).filter((d) => {
  if (!fs.statSync(path.join(ENTITIES_DIR, d)).isDirectory()) return false;
  if (!filterType) return true;
  return d.startsWith(`${filterType}_`);
});

for (const dir of dirs) {
  scanned++;
  const mdxPath = path.join(ENTITIES_DIR, dir, "entity.mdx");

  if (!fs.existsSync(mdxPath)) {
    noMdx++;
    continue;
  }

  const original = fs.readFileSync(mdxPath, "utf-8");
  const matches = original.match(IMPORT_RE);

  if (!matches || matches.length === 0) {
    skipped++;
    continue;
  }

  const result = original.replace(IMPORT_RE, "");

  // Vyčisti přebytečné prázdné řádky (3+ → 2) a trim konce
  const cleaned = result.replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "\n");

  if (dryRun) {
    console.log(`🔍 WOULD FIX: ${dir} (${matches.length} import řádků)`);
    fixed++;
  } else {
    fs.writeFileSync(mdxPath, cleaned, "utf-8");
    console.log(`✅ FIXED: ${dir} (${matches.length} import řádků)`);
    fixed++;
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`Scanned:    ${scanned}`);
console.log(`Fixed:      ${fixed}`);
console.log(`Skipped:    ${skipped} (no imports)`);
console.log(`NoMdx:      ${noMdx} (no entity.mdx)`);
if (dryRun) console.log(`(DRY RUN — no files were modified)`);