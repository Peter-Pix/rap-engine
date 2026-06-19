/**
 * Remove duplicate "Klíčová alba" and "Klíčové tracky" sections
 * from 44rap-imported MDX content.
 *
 * 44rap enrichment added Klíčová alba and Klíčové tracky sections at the
 * end of artist profiles. But these were often duplicates of content already
 * present in the original rich pages (in bullet-list format vs table format).
 *
 * Strategy: keep the FIRST occurrence (original rich content), remove the
 * SECOND occurrence (44rap import).
 *
 * Detection: find the second `## Klíčová alba` header and remove until the
 * next `## ` heading or end of file. Same for `## Klíčové tracky`.
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/dedup-key-albums";

async function backup(path: string) {
  if (!existsSync(path)) return;
  const content = await readFile(path, "utf-8");
  const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
  await mkdir(BACKUP_ROOT, { recursive: true });
  const filename = path.split("/").pop();
  const backupPath = join(BACKUP_ROOT, `${filename}_${Date.now()}_${hash}`);
  await copyFile(path, backupPath);
}

function findSectionRanges(content: string, sectionTitle: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  // Match headers like `## Klíčová alba` (with optional leading whitespace)
  // End-of-line anchor to avoid matching variants like "## Klíčová alba a projekty"
  const escaped = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headerRegex = new RegExp(`^##\\s+${escaped}\\s*$`, 'gm');
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    const start = match.index;
    // Find next ## header or end of file
    const afterHeader = start + match[0].length;
    const nextHeaderRegex = /^##\s+/gm;
    nextHeaderRegex.lastIndex = afterHeader;
    const nextMatch = nextHeaderRegex.exec(content);
    const end = nextMatch ? nextMatch.index : content.length;
    ranges.push({ start, end });
  }
  return ranges;
}

// Detect if first "Klíčová alba" header is actually a variant (not exact match)
// E.g. "## Klíčová alba / projekty", "## Klíčová alba a releasy"
function hasVariantHeader(content: string, baseTitle: string): boolean {
  const variantRegex = new RegExp(`^##\\s+${baseTitle}\\b(?!\\s*$)`, 'gm');
  return variantRegex.test(content);
}

async function main() {
  console.log("🧹 Removing duplicate Klíčová alba & Klíčové tracky\n");

  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const mdxPath = join(CONTENT_ROOT, dir.name, "entity.mdx");
    if (!existsSync(mdxPath)) continue;

    try {
      const content = await readFile(mdxPath, "utf-8");

      // Find duplicates - check both exact and variant headers
      const albumExact = findSectionRanges(content, "Klíčová alba");
      const albumVariant = hasVariantHeader(content, "Klíčová alba");
      const trackExact = findSectionRanges(content, "Klíčové tracky");

      // If there's a variant + exact, that's also a duplicate
      const hasDuplicateAlbums = albumExact.length >= 2 || (albumVariant && albumExact.length >= 1);
      const hasDuplicateTracks = trackExact.length >= 2;

      if (!hasDuplicateAlbums && !hasDuplicateTracks) {
        skipped++;
        continue;
      }

      // Backup before modifying
      await backup(mdxPath);

      // Build removal list
      // Strategy: keep ALL variants (original) and first exact. Remove 2nd+ exact.
      const toRemove: Array<{ start: number; end: number }> = [];
      if (albumExact.length >= 2) {
        for (let i = 1; i < albumExact.length; i++) {
          toRemove.push(albumExact[i]);
        }
      } else if (albumVariant && albumExact.length >= 1) {
        // Variant + exact = remove the exact (44rap one)
        toRemove.push(albumExact[0]);
      }
      if (trackExact.length >= 2) {
        for (let i = 1; i < trackExact.length; i++) {
          toRemove.push(trackExact[i]);
        }
      }

      // Sort descending to avoid offset issues
      toRemove.sort((a, b) => b.start - a.start);

      let newContent = content;
      for (const { start, end } of toRemove) {
        // Extend start backwards to consume the leading *** separator if present
        let actualStart = start;
        const beforeSection = newContent.slice(Math.max(0, start - 100), start);
        if (beforeSection.trimEnd().endsWith("***")) {
          const lines = newContent.slice(0, start).split('\n');
          // Remove trailing *** line
          let i = lines.length - 1;
          while (i >= 0 && lines[i].trim() === '') i--;
          if (i >= 0 && lines[i].trim() === '***') {
            // Truncate at this line
            actualStart = lines.slice(0, i).join('\n').length;
            if (lines.slice(0, i).length > 0) actualStart += 1; // for trailing newline
          }
        }
        // Extend end forward to consume trailing blank lines (but keep one \n)
        let actualEnd = end;
        while (actualEnd < newContent.length && newContent[actualEnd] === '\n') actualEnd++;

        newContent = newContent.slice(0, actualStart) + newContent.slice(actualEnd);
      }

      // Clean up multiple consecutive blank lines (3+ → 2)
      newContent = newContent.replace(/\n{3,}/g, "\n\n");

      if (newContent !== content) {
        await writeFile(mdxPath, newContent, "utf-8");
        processed++;
        const aFixed = albumExact.length >= 2 ? albumExact.length - 1 : (albumVariant && albumExact.length >= 1 ? 1 : 0);
        const tFixed = trackExact.length >= 2 ? trackExact.length - 1 : 0;
        console.log(`  ✅ ${dir.name} (-${aFixed} album, -${tFixed} tracks)`);
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`  ❌ ${dir.name}: ${(e as Error).message}`);
      errors++;
    }
  }

  console.log(`\n━━━ SUMMARY ━━━`);
  console.log(`  ✅ Processed: ${processed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`\n  Backups: ${BACKUP_ROOT}`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});