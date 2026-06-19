/**
 * Empty relations.json fixer.
 *
 * Pro každý album s prázdným {} relations.json:
 *  1. Inicializuje standardní strukturu
 *  2. Parsne feat z tracks.json → napojí feat artisty
 *  3. Najde label z meta.json → napojí
 *  4. Najde city/origin → napojí location
 *
 * Append-only: pokud relations.json už má něco, přeskočí.
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/empty-relations-fix";

const STANDARD_KEYS = [
  "albums", "artists", "genres", "influencedBy",
  "labels", "locations", "moods", "partOf",
  "related", "scenes", "styles", "themes", "tracks"
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function backup(path: string) {
  if (!existsSync(path)) return null;
  const content = await readFile(path, "utf-8");
  const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
  await mkdir(BACKUP_ROOT, { recursive: true });
  const filename = path.split("/").pop();
  const backupPath = join(BACKUP_ROOT, `${filename}_${Date.now()}_${hash}`);
  await copyFile(path, backupPath);
  return backupPath;
}

async function main() {
  console.log("🔧 Empty relations.json fixer\n");

  // 1. Build name → slug index pro artisty
  const artistNameMap: Record<string, string> = {};
  const artistSlugs = new Set<string>();
  const labelNameMap: Record<string, string> = {};
  const locationNameMap: Record<string, string> = {};

  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const slug = dir.name;
    const metaPath = join(CONTENT_ROOT, dir.name, "meta.json");
    if (!existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      const title = meta.title || "";
      if (slug.startsWith("artist_")) {
        artistSlugs.add(slug);
        if (title) artistNameMap[normalize(title)] = slug;
        const realName = meta.realName || meta.birthName;
        if (realName) artistNameMap[normalize(realName)] = slug;
        artistNameMap[normalize(slug.replace("artist_", "").replace(/-/g, " "))] = slug;
      } else if (slug.startsWith("label_")) {
        if (title) labelNameMap[normalize(title)] = slug;
        labelNameMap[normalize(slug.replace("label_", "").replace(/-/g, " "))] = slug;
      } else if (slug.startsWith("location_")) {
        if (title) locationNameMap[normalize(title)] = slug;
        locationNameMap[normalize(slug.replace("location_", "").replace(/-/g, " "))] = slug;
      }
    } catch {}
  }

  console.log(`📚 Index: ${artistSlugs.size} artistů, ${Object.keys(labelNameMap).length} labelů, ${Object.keys(locationNameMap).length} lokací\n`);

  // 2. Process all albums
  const albumDirs = dirs.filter((d) => d.isDirectory() && d.name.startsWith("album_"));

  let fixed = 0;
  let skipped = 0;
  let noTracks = 0;

  for (const dir of albumDirs) {
    const slug = dir.name;
    const relPath = join(CONTENT_ROOT, dir.name, "relations.json");
    if (!existsSync(relPath)) continue;

    let rel: Record<string, any>;
    try {
      rel = JSON.parse(await readFile(relPath, "utf-8"));
    } catch {
      rel = {};
    }

    // Skip if already has content
    const hasContent = STANDARD_KEYS.some((k) => Array.isArray(rel[k]) && rel[k].length > 0);
    if (hasContent) {
      skipped++;
      continue;
    }

    // Initialize empty structure
    if (Object.keys(rel).length === 0) {
      rel = Object.fromEntries(STANDARD_KEYS.map((k) => [k, []]));
    } else {
      // Ensure all keys exist
      for (const k of STANDARD_KEYS) {
        if (!rel[k]) rel[k] = [];
      }
    }

    // Load meta
    const metaPath = join(CONTENT_ROOT, dir.name, "meta.json");
    let meta: any = {};
    if (existsSync(metaPath)) {
      meta = JSON.parse(await readFile(metaPath, "utf-8"));
    }

    // 1. Find artist from meta.title (some albums have "Artist - Album" pattern)
    const albumTitle = meta.title || slug;
    // First, try to find any artist referenced in album title
    for (const [normName, artistSlug] of Object.entries(artistNameMap)) {
      if (albumTitle.toLowerCase().includes(normName) && normName.length > 3) {
        if (!rel.artists.includes(artistSlug)) {
          rel.artists.push(artistSlug);
        }
      }
    }

    // 2. Load tracks.json and parse feat → artists
    const tracksPath = join(CONTENT_ROOT, dir.name, "tracks.json");
    if (existsSync(tracksPath)) {
      try {
        const tracksData = JSON.parse(await readFile(tracksPath, "utf-8"));
        for (const t of tracksData.tracks || []) {
          for (const featName of t.feat || []) {
            const slug_ = artistNameMap[normalize(featName)];
            if (slug_ && !rel.artists.includes(slug_)) {
              rel.artists.push(slug_);
            }
          }
        }
      } catch {}
    } else {
      noTracks++;
    }

    // 3. Match label from meta.label
    if (meta.label) {
      const labelSlug = labelNameMap[normalize(meta.label)];
      if (labelSlug && !rel.labels.includes(labelSlug)) {
        rel.labels.push(labelSlug);
      }
    }

    // 4. Match location from meta.city/origin
    const cityStr = meta.city || meta.origin || "";
    if (cityStr) {
      const firstCity = cityStr.split(",")[0].trim();
      const locSlug = locationNameMap[normalize(firstCity)];
      if (locSlug && !rel.locations.includes(locSlug)) {
        rel.locations.push(locSlug);
      }
    }

    // Backup before write
    await backup(relPath);
    await writeFile(relPath, JSON.stringify(rel, null, 2), "utf-8");
    fixed++;

    if (fixed % 10 === 0) {
      console.log(`  [${fixed}] ${slug} → ${rel.artists.length} artists, ${rel.labels.length} labels, ${rel.locations.length} locations`);
    }
  }

  console.log(`\n━━━ SUMMARY ━━━`);
  console.log(`  ✅ Fixed: ${fixed} albums`);
  console.log(`  ⏭️  Skipped (already has content): ${skipped}`);
  console.log(`  📀 Without tracks.json: ${noTracks}`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});