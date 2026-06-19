/**
 * Entity cleanup podle scope rule.
 *
 * Strategie:
 *  1. ZAHRANIČNÍ feat-only artisti (Snoop Dogg, Playboi Carti, J Dilla...) → SMAZAT
 *     Scope rule z HEARTBEAT: nepatří do RKG
 *  2. CZ/SK artisti s quality_score <= 1 (žádná reálná data) → status=draft + noindex
 *     Tím se stránka nezobrazuje v search/listingu, ale reference zůstanou validní
 *  3. CZ/SK artisti s quality_score >= 2 → nechat (data doplníme později)
 *
 * Před smazáním/cokoli:
 *  - Backup všech relations, kde je entita cílem (aby šlo obnovit)
 *  - Cleanup všech relations.json, kde je entita v related/artists/labels
 */

import { readFile, writeFile, mkdir, readdir, copyFile, rm } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/cleanup";

// Scope rule: Zahraniční feat-only artisti (scope rule: NE v RKG)
const FOREIGN_FEAT_ONLY = new Set([
  "artist_snoop-dogg",
  "artist_playboi-carti",
  "artist_playboi-carti-energy",
  "artist_j-dilla",
  "artist_jorja-smith",
  "artist_iamddb",
  "artist_brotha-lynch-hung",
  "artist_everlast",
  "artist_fka-twigs",
  "artist_ghostemane",
  "artist_hudson-mohawke",
  "artist_ill-bill",
  "artist_kaytranada",
  "artist_little-simz",
  "artist_machine-gun-kelly",
  "artist_necro",
  "artist_night-lovell",
  "artist_scarlxrd",
  "artist_sevdaliza",
  "artist_skepta",
  "artist_statik-selektah",
  "artist_sza",
  "artist_the-alchemist",
  "artist_the-kid-laroi",
  "artist_uicideboy",
  "artist_yelawolf",
  "artist_young-g",
  "artist_zillakami",
  "artist_freezer",
  "artist_voodoo808",
  "artist_p-money",
  "artist_dj-mad-skill",
  "artist_madskill",
  "artist_el-nino",
  "artist_dollar-prynce",
  "artist_john-wolfhooker",
  "artist_marys",
  "artist_shxrty",
]);

// Důležití CZ/SK artisti (i s chybějícími daty, NIKDY draft/mazat)
const IMPORTANT_CZ_SK = new Set([
  // Legendy
  "artist_psh", "artist_prago-union", "artist_kato-prago-union",
  "artist_dj-anys", "artist_dj-mike-trafik", "artist_dj-flux",
  "artist_dj-rusty", "artist_dj-kadr", "artist_dj-maztah",
  // Milion+ crew
  "artist_yzomandias", "artist_nik-tendo", "artist_calin",
  "artist_smack", "artist_smack-one", "artist_karlow",
  // DMS
  "artist_separ", "artist_dame", "artist_smart", "artist_haha-crew",
  // Kontrafakt
  "artist_ego", "artist_rytmus", "artist_anos",
  // Heavy hitters
  "artist_separ", "artist_ektor", "artist_paulie-garand", "artist_dj-fatty",
  "artist_dj-fatte", "artist_dex", "artist_hugo-toxxx", "artist_vec",
  "artist_idea", "artist_rest", "artist_majself", "artist_luisa",
  // Důležitý ze starý školy
  "artist_robert-burian", "artist_tomi", "artist_de-sade",
  "artist_7krt3", "artist_anko", "artist_strapo",
  "artist_dj-maztah", "artist_dj-cypher", "artist_lord-mytago",
  "artist_jericho", "artist_vladimír-518", "artist_orbital",
  "artist_ordos", "artist_a.m.t", "artist_les", "artist_erio",
  "artist_dj-wawe", "artist_dj-rupp", "artist_dj-milhouse",
  "artist_dj-thomas", "artist_dj-pm", "artist_kontrafakt",
  "artist_kontrafakt", "artist_anos", "artist_kali", "artist_petrulka",
  "artist_plojhar", "artist_josefov", "artist_ony", "artist_la4",
  "artist_bra3", "artist_johnny-mezek", "artist_sid",
]);

interface MetaData {
  id: string;
  type: string;
  slug: string;
  title: string;
  status?: string;
  isStub?: boolean;
  [k: string]: any;
}

async function backupEntity(slug: string) {
  const dirPath = join(CONTENT_ROOT, slug);
  if (!existsSync(dirPath)) return;

  await mkdir(BACKUP_ROOT, { recursive: true });
  const hash = createHash("md5").update(slug + Date.now()).digest("hex").slice(0, 8);
  const backupDir = join(BACKUP_ROOT, `${slug}_${Date.now()}_${hash}`);
  await mkdir(backupDir, { recursive: true });

  // Backup all files
  const files = ["meta.json", "relations.json", "entity.mdx"];
  for (const f of files) {
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
  console.log("🧹 Entity cleanup podle scope rule\n");
  if (isDryRun) console.log("⚠️  DRY RUN - nic nebude smazáno\n");

  // 1. Build existing set
  const allSlugs = new Set<string>();
  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  for (const dir of dirs) {
    if (dir.isDirectory()) allSlugs.add(dir.name);
  }

  console.log(`📊 Total entities: ${allSlugs.size}\n`);

  // 2. Categorize
  const foreignToDelete: string[] = [];
  const czsToMakeDraft: string[] = [];

  for (const slug of allSlugs) {
    if (!slug.startsWith("artist_")) continue;

    // Foreign feat-only?
    if (FOREIGN_FEAT_ONLY.has(slug)) {
      foreignToDelete.push(slug);
      continue;
    }

    // Důležitý CZ/SK (i bez dat) - nikdy draft
    if (IMPORTANT_CZ_SK.has(slug)) {
      continue;
    }

    // CZ/SK with poor data?
    const metaPath = join(CONTENT_ROOT, slug, "meta.json");
    if (!existsSync(metaPath)) continue;

    try {
      const meta: MetaData = JSON.parse(await readFile(metaPath, "utf-8"));
      const relPath = join(CONTENT_ROOT, slug, "relations.json");
      const rel = existsSync(relPath)
        ? JSON.parse(await readFile(relPath, "utf-8"))
        : {};

      const has_real_name = !!(meta.realName || meta.birthName);
      const has_birth = !!meta.birthDate;
      const has_city = !!(meta.city || meta.origin);
      const has_label = !!meta.label;
      const has_active = !!meta.activeSince;
      const quality = [has_real_name, has_birth, has_city, has_label, has_active].filter(Boolean).length;

      const out_count = Object.values(rel).filter((v) => Array.isArray(v)).reduce(
        (sum: number, v: any) => sum + v.length,
        0
      );

      if (quality <= 1 && out_count <= 2) {
        czsToMakeDraft.push(slug);
      }
    } catch {}
  }

  console.log(`🌍 Zahraniční k smazání: ${foreignToDelete.length}`);
  for (const s of foreignToDelete.slice(0, 10)) {
    console.log(`    ${s}`);
  }
  if (foreignToDelete.length > 10) console.log(`    ... +${foreignToDelete.length - 10}`);

  console.log(`\n🇨🇿 CZ/SK → draft status: ${czsToMakeDraft.length}`);
  for (const s of czsToMakeDraft.slice(0, 10)) {
    const metaPath = join(CONTENT_ROOT, s, "meta.json");
    let title = s;
    try {
      const m = JSON.parse(await readFile(metaPath, "utf-8"));
      title = m.title || s;
    } catch {}
    console.log(`    ${title} (${s})`);
  }
  if (czsToMakeDraft.length > 10) console.log(`    ... +${czsToMakeDraft.length - 10}`);

  // 3. Execute
  let deletedCount = 0;
  let draftCount = 0;

  if (isDryRun) {
    console.log(`\n[DRY RUN] Would delete ${foreignToDelete.length} foreign entities`);
    console.log(`[DRY RUN] Would mark ${czsToMakeDraft.length} CZ/SK as draft`);
    console.log(`\n✨ Dry run hotov. Pro skutečnou akci spusť bez --dry-run`);
    return;
  }

  // 3a. Delete foreign entities
  console.log(`\n━━━ DELETING FOREIGN ENTITIES ━━━\n`);
  for (const slug of foreignToDelete) {
    // Backup first
    await backupEntity(slug);

    // Remove from all relations
    const removed = await removeFromAllRelations(slug);

    // Delete directory
    const dirPath = join(CONTENT_ROOT, slug);
    await rm(dirPath, { recursive: true, force: true });
    deletedCount++;

    console.log(`  🗑️  ${slug} (-${removed} references)`);
  }

  // 3b. Mark CZ/SK as draft
  console.log(`\n━━━ MARKING CZ/SK AS DRAFT ━━━\n`);
  for (const slug of czsToMakeDraft) {
    const metaPath = join(CONTENT_ROOT, slug, "meta.json");

    try {
      const meta: MetaData = JSON.parse(await readFile(metaPath, "utf-8"));

      // Backup
      await backupEntity(slug);

      // Update status
      meta.status = "draft";
      meta.draftReason = "minimal-data-2026-06-19";
      meta.publishedAt = meta.publishedAt || new Date().toISOString().split("T")[0];

      await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
      draftCount++;
    } catch {}
  }

  // 4. Summary
  console.log(`\n━━━ SUMMARY ━━━`);
  console.log(`  🗑️  Deleted (foreign): ${deletedCount}`);
  console.log(`  📝 Marked draft (CZ/SK): ${draftCount}`);
  console.log(`\n  Total entities before: ${allSlugs.size}`);
  console.log(`  Total entities after: ${allSlugs.size - deletedCount + draftCount}`);
  console.log(`  Net change: ${-deletedCount}`);
  console.log(`\n✨ Hotovo!`);
  console.log(`\nNext: Rebuild .content-cache/ + page-helpers musí respektovat status=draft (noindex)`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});