/**
 * Entity merge & dedup.
 *
 * Strategie:
 *  1. Draft entita s published duplikátem (stejný title) → smazat draft
 *  2. Slug variants stejného jména (např. milion vs milion-plus) → zachovat tu s daty
 *  3. Přidat alias do related entities pro redirect (pro UX)
 */

import { readFile, writeFile, mkdir, readdir, copyFile, rm } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";
import * as unicodedata from "node:util";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/dedup";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

async function backupEntity(slug: string) {
  const dirPath = join(CONTENT_ROOT, slug);
  if (!existsSync(dirPath)) return;

  await mkdir(BACKUP_ROOT, { recursive: true });
  const hash = createHash("md5").update(slug + Date.now()).digest("hex").slice(0, 8);
  const backupDir = join(BACKUP_ROOT, `${slug}_${Date.now()}_${hash}`);
  await mkdir(backupDir, { recursive: true });

  for (const f of ["meta.json", "relations.json", "entity.mdx"]) {
    const src = join(dirPath, f);
    if (existsSync(src)) {
      await copyFile(src, join(backupDir, f));
    }
  }
}

async function removeFromAllRelations(targetSlug: string): Promise<number> {
  let removedCount = 0;
  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const relPath = join(CONTENT_ROOT, dir.name, "relations.json");
    if (!existsSync(relPath)) continue;

    try {
      const rel = JSON.parse(await readFile(relPath, "utf-8"));
      let changed = false;

      for (const k of Object.keys(rel)) {
        if (Array.isArray(rel[k]) && rel[k].includes(targetSlug)) {
          rel[k] = rel[k].filter((x: string) => x !== targetSlug);
          removedCount++;
          changed = true;
        }
      }

      if (changed) {
        await writeFile(relPath, JSON.stringify(rel, null, 2), "utf-8");
      }
    } catch {}
  }

  return removedCount;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log("🔗 Entity dedup & merge\n");
  if (isDryRun) console.log("⚠️  DRY RUN - nic nebude smazáno\n");

  // 1. Load all meta
  const allMeta: Record<string, any> = {};
  for (const d of await readdir(CONTENT_ROOT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const metaPath = join(CONTENT_ROOT, d.name, "meta.json");
    if (!existsSync(metaPath)) continue;
    try {
      allMeta[d.name] = JSON.parse(await readFile(metaPath, "utf-8"));
    } catch {}
  }

  // 2. Group by normalized title (only same-type entities)
  const groups: Record<string, string[]> = {};
  for (const [slug, meta] of Object.entries(allMeta)) {
    const type = slug.split("_")[0];
    const title = meta.title || "";
    if (!title) continue;
    const norm = normalize(title);
    const key = `${type}::${norm}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(slug);
  }

  // 3. Process duplicates
  let mergedCount = 0;
  let keptCount = 0;
  let skippedNonDuplicates = 0;

  for (const [key, slugs] of Object.entries(groups)) {
    if (slugs.length <= 1) continue;

    const [type] = key.split("::");

    // Check if all have same artist/year — if not, they're different entities (e.g. Jeden vs J.Eden)
    const allSameMeta = slugs.every((s) => {
      const m = allMeta[s];
      const others = slugs.filter((x) => x !== s).map((x) => allMeta[x]);
      return others.every((o) =>
        JSON.stringify(m.artists || m.year || "") === JSON.stringify(o.artists || o.year || "")
      );
    });

    if (!allSameMeta) {
      const titles = slugs.map((s) => allMeta[s].title).join(", ");
      console.log(`\n[${type}] "${titles}"`);
      console.log(`  ℹ️  Různí artisti/roky — ne duplikáty, nechat všechny`);
      keptCount += slugs.length;
      skippedNonDuplicates += slugs.length;
      continue;
    }

    // Rank by quality: published > draft (prefer published)
    const sorted = [...slugs].sort((a, b) => {
      const statusA = allMeta[a].status || "draft";
      const statusB = allMeta[b].status || "draft";
      const publishedA = statusA === "published" || statusA === "active";
      const publishedB = statusB === "published" || statusB === "active";

      // Prefer published
      if (publishedA !== publishedB) return publishedA ? -1 : 1;

      // Never prefer stub over non-stub
      const stubA = allMeta[a].isStub === true;
      const stubB = allMeta[b].isStub === true;
      if (stubA !== stubB) return stubA ? 1 : -1;

      // Then prefer more metadata fields
      const fieldsA = Object.keys(allMeta[a]).filter((k) => !["id", "type", "slug", "title", "description", "publishedAt", "isStub", "draftReason"].includes(k)).length;
      const fieldsB = Object.keys(allMeta[b]).filter((k) => !["id", "type", "slug", "title", "description", "publishedAt", "isStub", "draftReason"].includes(k)).length;
      if (fieldsA !== fieldsB) return fieldsB - fieldsA;

      // Prefer longer description (more content)
      const descA = (allMeta[a].description || "").length;
      const descB = (allMeta[b].description || "").length;
      if (descA !== descB) return descB - descA;

      // Prefer shorter slug (cleaner)
      return a.length - b.length;
    });

    const keep = sorted[0];
    const toRemove = sorted.slice(1);

    console.log(`\n[${type}] "${allMeta[keep].title}"`);
    console.log(`  ✅ KEEP: ${keep}`);
    for (const r of toRemove) {
      console.log(`  🗑️  REMOVE: ${r}`);
    }

    // Remove duplicates
    for (const r of toRemove) {
      // Backup
      if (!isDryRun) {
        await backupEntity(r);
        // Remove from all relations
        const refs = await removeFromAllRelations(r);
        // Delete directory
        const dirPath = join(CONTENT_ROOT, r);
        await rm(dirPath, { recursive: true, force: true });
        console.log(`    🗑️  Deleted ${r} (-${refs} references)`);
      } else {
        console.log(`    [DRY] Would delete ${r}`);
      }
      mergedCount++;
    }
    keptCount += 1;
  }

  console.log(`\n━━━ SUMMARY ━━━`);
  console.log(`  🗑️  Merged/deleted: ${mergedCount}`);
  console.log(`  ✅ Kept unique: ${keptCount}`);
  if (isDryRun) console.log(`\n  ⚠️  DRY RUN - pro skutečnou akci spusť bez --dry-run`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});