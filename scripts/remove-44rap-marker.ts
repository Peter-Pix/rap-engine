/**
 * Remove 44rap-import comment markers from MDX files.
 *
 * The `<!-- 44rap-import -->` was meant as a separator marker when appending
 * 44rap data to existing MDX. But MDX doesn't recognize HTML comments inside
 * paragraph contexts and renders them as escaped text in HTML.
 *
 * This script removes the marker line cleanly while preserving the actual
 * content that was imported from 44rap.
 */

import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/remove-44rap-marker";

async function main() {
  console.log("🧹 Removing 44rap-import markers from MDX\n");

  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  await mkdir(BACKUP_ROOT, { recursive: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const mdxPath = join(CONTENT_ROOT, dir.name, "entity.mdx");
    if (!existsSync(mdxPath)) continue;

    try {
      const content = await readFile(mdxPath, "utf-8");

      // Check if marker exists
      if (!content.includes("44rap-import") && !content.includes("44rap import")) {
        skipped++;
        continue;
      }

      // Backup before modifying
      const backupPath = join(BACKUP_ROOT, `${dir.name}_${Date.now()}.mdx`);
      await writeFile(backupPath, content, "utf-8");

      // Remove the marker line (and any surrounding blank lines)
      let newContent = content;

      // Pattern 1: <!-- 44rap-import --> on its own line
      newContent = newContent.replace(/^[ \t]*<!--\s*44rap[\s-]import\s*-->[ \t]*\r?\n/gm, "");

      // Pattern 2: 44rap-import text in HTML escape (as fallback)
      newContent = newContent.replace(/&lt;!--\s*44rap[\s-]import\s*--&gt;\r?\n?/g, "");

      // Pattern 3: Just the text "44rap-import" on its own line (defensive)
      newContent = newContent.replace(/^[ \t]*44rap[\s-]import[ \t]*\r?\n/gm, "");

      // Clean up multiple consecutive blank lines (3+ → 2)
      newContent = newContent.replace(/\n{3,}/g, "\n\n");

      if (newContent !== content) {
        await writeFile(mdxPath, newContent, "utf-8");
        processed++;
        if (processed % 20 === 0) {
          console.log(`  [${processed}] processed ${dir.name}`);
        }
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