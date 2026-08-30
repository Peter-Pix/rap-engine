#!/usr/bin/env -S npx tsx

/**
 * Backfill chybějících `description` do meta.json (SEO).
 *
 * Projde content/entities/ a pro entity bez description vygeneruje
 * description z entity.mdx:
 *   - artist: první odstavec ze sekce "O rapperovi" / "O producentovi"
 *             (fallback: první odstavec po frontmatteru)
 *   - theme:  "Téma <Title>" (konzistentní s existujícím vzorem)
 *
 * Usage:
 *   npx tsx scripts/backfill-descriptions.ts
 *   npx tsx scripts/backfill-descriptions.ts --dry-run   # náhled bez zápisu
 *
 * Exit codes:
 *   0 — success
 *   1 — fatal error
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CONTENT_ROOT = join(process.cwd(), "content", "entities");
const DRY_RUN = process.argv.includes("--dry-run");

/** Odstraní YAML frontmatter z MDX. */
function stripFrontmatter(mdx: string): string {
  return mdx.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

/** Najde první odstavec ze sekce "O rapperovi" / "O producentovi". */
function extractBio(mdx: string): string | null {
  const body = stripFrontmatter(mdx);
  // Sekce "O rapperovi" / "O producentovi" — vezmi první odstavec po nadpisu
  const sectionMatch = body.match(/^##\s+O (?:rapperovi|producentovi)\s*\n+([^\n#]+)/m);
  if (sectionMatch && sectionMatch[1].trim()) {
    return sectionMatch[1].trim();
  }
  // Fallback: první odstavec po frontmatteru (první neprázdný řádek, ne nadpis)
  const firstPara = body.split(/\n\s*\n/).map((p) => p.trim()).find(
    (p) => p && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("---"),
  );
  return firstPara && firstPara.length > 0 ? firstPara : null;
}

function main(): void {
  console.log(`🔍 Backfilling descriptions (${DRY_RUN ? "DRY-RUN" : "WRITE"})...\n`);

  let fixed = 0;
  let skipped = 0;

  for (const dir of readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const metaPath = join(CONTENT_ROOT, dir.name, "meta.json");
    const mdxPath = join(CONTENT_ROOT, dir.name, "entity.mdx");
    if (!existsSync(metaPath)) continue;

    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const current = meta.description || "";
    if (current.trim()) {
      skipped++;
      continue;
    }

    const type = meta.type || "";
    const title = meta.title || dir.name;
    let description: string | null = null;

    if (type === "theme") {
      description = `Téma ${title}`;
    } else if (existsSync(mdxPath)) {
      description = extractBio(readFileSync(mdxPath, "utf-8"));
    }

    if (!description) {
      console.log(`   ⚠️  ${dir.name}: nelze vygenerovat description (prázdný MDX)`);
      skipped++;
      continue;
    }

    // Omezení délky (SEO: ~160 znaků)
    if (description.length > 200) {
      description = description.slice(0, 197).trimEnd() + "...";
    }

    meta.description = description;
    if (!DRY_RUN) {
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf-8");
    }
    console.log(`   ✅ ${dir.name}: "${description.slice(0, 60)}..."`);
    fixed++;
  }

  console.log(`\n📊 Fixed: ${fixed} | Skipped (already have): ${skipped}`);
  if (DRY_RUN) console.log("   (dry-run — nic nezapsáno)");
}

main();
