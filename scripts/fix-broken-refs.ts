/**
 * Broken reference stub creator.
 *
 * Pro každý chybějící cíl v relations (label_X, artist_X) vytvoří
 * stub entitu s minimálními daty (meta + relations) aby se nezobrazovalo 404.
 *
 * UPOZORNĚNÍ: Zahraniční umělce (Kanye West, Eminem...) přeskočí podle scope rule.
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/broken-refs-fix";

const STANDARD_KEYS = [
  "albums", "artists", "genres", "influencedBy",
  "labels", "locations", "moods", "partOf",
  "related", "scenes", "styles", "themes", "tracks"
];

// Scope rule: Zahraniční feat-only artisti → NE
const FOREIGN_PATTERN = /^(kanye|eminem|snoop|drake|rihanna|nicki|j-cole|kendrick|jay-z|beyonce|jayz|travis|scott|post|malone|future|metro|21\s*savage|dr\b|lil|taylor|swift|weeknd|bad\b|bunny|harry|styles|edsheeran|drake|kanye|sia|adele|imagine|dragon|lukas|bruno|mars|chris|brown|olivia|rodrigo|ariana|grande|doja|dualipa|billie|eilish|badbunny|peso|pluma|feid|mora|sech|rauw|j-balvin|maluma|ozuna|reggaeton|anuel|arcangel|de\w+la|ozu)/i;

async function main() {
  console.log("🩹 Broken reference stub creator\n");

  // 1. Build existing entities index
  const existing = new Set<string>();
  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  for (const dir of dirs) {
    if (dir.isDirectory()) existing.add(dir.name);
  }

  // 2. Find all broken refs
  const brokenRefs: { target: string; source: string }[] = [];
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const relPath = join(CONTENT_ROOT, dir.name, "relations.json");
    if (!existsSync(relPath)) continue;
    try {
      const rel = JSON.parse(await readFile(relPath, "utf-8"));
      for (const k of STANDARD_KEYS) {
        if (!Array.isArray(rel[k])) continue;
        for (const target of rel[k]) {
          if (
            (target.startsWith("artist_") ||
              target.startsWith("label_") ||
              target.startsWith("location_") ||
              target.startsWith("genre_") ||
              target.startsWith("style_") ||
              target.startsWith("mood_") ||
              target.startsWith("theme_") ||
              target.startsWith("scene_") ||
              target.startsWith("collective_") ||
              target.startsWith("producer_") ||
              target.startsWith("album_") ||
              target.startsWith("track_") ||
              target.startsWith("article_")) &&
            !existing.has(target)
          ) {
            brokenRefs.push({ target, source: dir.name });
          }
        }
      }
    } catch {}
  }

  // Dedupe targets
  const uniqueTargets = Array.from(new Set(brokenRefs.map((b) => b.target)));
  console.log(`🚨 Broken refs: ${brokenRefs.length} (${uniqueTargets.length} unique targets)\n`);

  // 3. For each target, decide:
  //    - Is it foreign? → Skip (scope rule)
  //    - Is it a label? → Create stub
  //    - Is it an artist? → Skip if clearly foreign
  //    - Otherwise → Create stub

  let created = 0;
  let skippedForeign = 0;
  const skippedList: string[] = [];

  for (const target of uniqueTargets) {
    // Extract name
    const namePart = target.replace(/^(artist|label|location|genre|style|mood|theme|scene|collective|producer|album|track|article)_/, "");
    const readableName = namePart
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    // Skip foreign artists
    if (target.startsWith("artist_") && FOREIGN_PATTERN.test(readableName)) {
      skippedForeign++;
      skippedList.push(target);
      continue;
    }

    // Skip some obvious things
    if (target.includes("fvck-kvlt")) continue; // Already exists with different slug
    if (target.includes("ca-hanova-bulhar")) continue;
    if (target.includes("eznk")) continue;
    if (target.includes("reznik")) continue;
    if (target.includes("handlova")) continue;

    // Create stub
    const dirPath = join(CONTENT_ROOT, target);
    await mkdir(dirPath, { recursive: true });

    const meta: Record<string, any> = {
      id: target,
      type: target.split("_")[0],
      slug: namePart,
      title: readableName,
      description: `${readableName} — stub. Plný profil bude doplněn později.`,
      publishedAt: new Date().toISOString().split("T")[0],
      isStub: true,
      stubReason: "broken-reference-fix-2026-06-19",
    };

    if (target.startsWith("artist_")) {
      meta.occupation = ["rapper"];
    } else if (target.startsWith("label_")) {
      meta.location = "Česko";
    }

    await writeFile(join(dirPath, "meta.json"), JSON.stringify(meta, null, 2), "utf-8");

    const emptyRels = Object.fromEntries(STANDARD_KEYS.map((k) => [k, []]));
    await writeFile(
      join(dirPath, "relations.json"),
      JSON.stringify(emptyRels, null, 2),
      "utf-8"
    );

    await writeFile(
      join(dirPath, "entity.mdx"),
      `---\nid: ${target}\ntype: ${meta.type}\ntitle: "${readableName}"\n---\n\n# ${readableName}\n\nProfil ${readableName} zatím nemá detailní popis. Informace budou doplněny z dalších zdrojů.\n`
    );

    created++;
  }

  console.log(`━━━ SUMMARY ━━━`);
  console.log(`  ✅ Stubs created: ${created}`);
  console.log(`  🌍 Skipped (foreign, scope rule): ${skippedForeign}`);
  if (skippedList.length > 0) {
    console.log(`\n  Foreign skipped (top 10):`);
    for (const t of skippedList.slice(0, 10)) {
      console.log(`    ${t}`);
    }
  }
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});