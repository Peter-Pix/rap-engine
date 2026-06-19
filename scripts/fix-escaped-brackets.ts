/**
 * Fix malformed markdown links with escaped brackets.
 *
 * Pattern: `[\[text\]](url)` should be `[text](url)`.
 * This happens when a markdown link text contains escaped square brackets
 * (which were used for `[1]` footnote-style references but don't render
 * properly inside link syntax).
 *
 * Fix: strip the leading `\[` and trailing `\]` from inside the link text.
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/fix-escaped-brackets";

async function backup(path: string) {
  if (!existsSync(path)) return;
  const content = await readFile(path, "utf-8");
  const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
  await mkdir(BACKUP_ROOT, { recursive: true });
  const filename = path.split("/").pop();
  const backupPath = join(BACKUP_ROOT, `${filename}_${Date.now()}_${hash}`);
  await copyFile(path, backupPath);
}

async function main() {
  console.log("🔗 Fixing escaped bracket links\n");

  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  let processed = 0;
  let skipped = 0;
  let totalFixed = 0;

  // Pattern: [\[text\]](url) → [text](url)
  // Match [ then \[ then any chars (non-greedy) then \] then ](url)
  const bracketLinkRegex = /\[\\\[([^\]]*?)\\\]\]\(([^)]+)\)/g;

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const mdxPath = join(CONTENT_ROOT, dir.name, "entity.mdx");
    if (!existsSync(mdxPath)) continue;

    try {
      const content = await readFile(mdxPath, "utf-8");
      const matches = [...content.matchAll(bracketLinkRegex)];

      if (matches.length === 0) {
        skipped++;
        continue;
      }

      // Backup
      await backup(mdxPath);

      // Replace: [\[text\]](url) → [text](url)
      const newContent = content.replace(bracketLinkRegex, "[$1]($2)");

      if (newContent !== content) {
        await writeFile(mdxPath, newContent, "utf-8");
        processed++;
        totalFixed += matches.length;
        if (processed % 10 === 0) {
          console.log(`  [${processed}] ${dir.name}: ${matches.length} links fixed`);
        }
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`  ❌ ${dir.name}: ${(e as Error).message}`);
    }
  }

  console.log(`\n━━━ SUMMARY ━━━`);
  console.log(`  ✅ Processed: ${processed} files`);
  console.log(`  🔗 Total links fixed: ${totalFixed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`\n  Backups: ${BACKUP_ROOT}`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});