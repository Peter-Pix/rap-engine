/**
 * Deezer feat → RKG relations enhancement.
 *
 * Projde všechna tracks.json, najde feat v tracklistech, matchne proti RKG artistům
 * a přidá nové collab edges do artist relations.
 *
 * Pravidla (scope):
 *   - Přidává POUZE feat hosty co matchnou v RKG
 *   - Zahraniční / neznámí hosté se ignorují (scope rule)
 *   - Přidává edges: artist_*.relations.tracks/related → artist_feat_slug
 *   - Albumu přidá feat artisty do relations.artists (pokud chybí)
 *
 * Append-only, idempotent.
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/feat-enhance";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

async function backup(slug: string, content: any) {
  await mkdir(BACKUP_ROOT, { recursive: true });
  const path = join(CONTENT_ROOT, `artist_${slug}`, "relations.json");
  if (existsSync(path)) {
    const hash = createHash("md5").update(JSON.stringify(content)).digest("hex").slice(0, 8);
    const backupPath = join(BACKUP_ROOT, `${slug}_${Date.now()}_${hash}.json`);
    await copyFile(path, backupPath);
  }
}

async function main() {
  console.log("🎤 Feat → RKG relations enhancement\n");

  // 1. Build RKG artist name index
  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });
  const nameToSlug: Record<string, string> = {};
  const artistMeta: Record<string, any> = {};

  for (const dir of dirs) {
    if (!dir.isDirectory() || !dir.name.startsWith("artist_")) continue;
    const slug = dir.name.replace(/^artist_/, "");
    try {
      const meta = JSON.parse(await readFile(join(CONTENT_ROOT, dir.name, "meta.json"), "utf-8"));
      artistMeta[slug] = meta;
      const title = meta.title || "";
      const realName = meta.realName || meta.birthName || "";
      nameToSlug[normalize(title)] = slug;
      if (realName) nameToSlug[normalize(realName)] = slug;
      // Also normalize slug itself
      nameToSlug[normalize(slug.replace(/-/g, " "))] = slug;
    } catch {}
  }

  console.log(`📚 RKG artists loaded: ${Object.keys(artistMeta).length}\n`);

  // 2. Process all tracks.json
  let totalFeats = 0;
  let matchedFeats = 0;
  const albumFeatEdges: Record<string, Set<string>> = {}; // album_slug → Set<feat_artist_id>
  const artistCollabEdges: Record<string, Map<string, number>> = {}; // main_artist → Map<feat_artist, count>

  for (const dir of dirs) {
    if (!dir.isDirectory() || !dir.name.startsWith("album_")) continue;
    const albumSlug = dir.name.replace(/^album_/, "");
    const tracksPath = join(CONTENT_ROOT, dir.name, "tracks.json");
    if (!existsSync(tracksPath)) continue;

    try {
      const data = JSON.parse(await readFile(tracksPath, "utf-8"));
      const tracks = data.tracks || [];
      const albumFeats = new Set<string>();

      for (const t of tracks) {
        for (const featName of t.feat || []) {
          totalFeats++;
          const norm = normalize(featName);
          const featSlug = nameToSlug[norm];
          if (featSlug) {
            matchedFeats++;
            albumFeats.add(`artist_${featSlug}`);

            // Build per-artist collab map (album artists → feat artists)
            const relPath = join(CONTENT_ROOT, dir.name, "relations.json");
            const rel = JSON.parse(await readFile(relPath, "utf-8"));
            for (const aa of rel.artists || []) {
              const mainSlug = aa.replace(/^artist_/, "");
              if (mainSlug === featSlug) continue; // skip self-feat
              if (!artistCollabEdges[mainSlug]) artistCollabEdges[mainSlug] = new Map();
              const m = artistCollabEdges[mainSlug];
              m.set(featSlug, (m.get(featSlug) || 0) + 1);
            }
          }
        }
      }

      if (albumFeats.size > 0) {
        albumFeatEdges[albumSlug] = albumFeats;
      }
    } catch {}
  }

  console.log(`📊 Feat analysis:`);
  console.log(`   Total: ${totalFeats}`);
  console.log(`   Matched to RKG: ${matchedFeats} (${((matchedFeats / totalFeats) * 100).toFixed(1)}%)`);
  console.log(`   Unique album-feat edges: ${Object.values(albumFeatEdges).reduce((s, st) => s + st.size, 0)}\n`);

  // 3. Update album relations.artists (add feat artists)
  console.log("━━━ PHASE 1: Update album relations ━━━\n");
  let albumUpdates = 0;
  let albumEdgesAdded = 0;

  for (const [albumSlug, featSet] of Object.entries(albumFeatEdges)) {
    const relPath = join(CONTENT_ROOT, `album_${albumSlug}`, "relations.json");
    const rel = JSON.parse(await readFile(relPath, "utf-8"));
    if (!rel.artists) rel.artists = [];

    let changed = false;
    for (const featArtist of featSet) {
      if (!rel.artists.includes(featArtist)) {
        rel.artists.push(featArtist);
        albumEdgesAdded++;
        changed = true;
      }
    }

    if (changed) {
      // Backup
      const hash = createHash("md5").update(JSON.stringify(rel)).digest("hex").slice(0, 8);
      const backupPath = join(BACKUP_ROOT, `album_${albumSlug}_${Date.now()}_${hash}.json`);
      await mkdir(BACKUP_ROOT, { recursive: true });
      await copyFile(relPath, backupPath);
      await writeFile(relPath, JSON.stringify(rel, null, 2), "utf-8");
      albumUpdates++;
    }
  }

  console.log(`  ✅ Updated ${albumUpdates} albums (+${albumEdgesAdded} new artist edges)\n`);

  // 4. Update artist relations (add collab + tracks)
  console.log("━━━ PHASE 2: Update artist relations ━━━\n");
  let artistUpdates = 0;
  let collabEdgesAdded = 0;
  let trackEdgesAdded = 0;

  for (const [mainSlug, collabs] of Object.entries(artistCollabEdges)) {
    const relPath = join(CONTENT_ROOT, `artist_${mainSlug}`, "relations.json");
    let rel: any;
    try {
      rel = JSON.parse(await readFile(relPath, "utf-8"));
    } catch {
      rel = { artists: [], albums: [], genres: [], influencedBy: [], labels: [], locations: [], moods: [], partOf: [], related: [], scenes: [], styles: [], themes: [], tracks: [] };
    }
    // Ensure all keys
    for (const k of ["artists", "albums", "genres", "influencedBy", "labels", "locations", "moods", "partOf", "related", "scenes", "styles", "themes", "tracks"]) {
      if (!rel[k]) rel[k] = [];
    }

    let changed = false;
    for (const [featSlug, count] of collabs.entries()) {
      const featId = `artist_${featSlug}`;
      // Add to related (if not already)
      if (!rel.related.includes(featId)) {
        rel.related.push(featId);
        collabEdgesAdded++;
        changed = true;
      }
    }

    if (changed) {
      const hash = createHash("md5").update(JSON.stringify(rel)).digest("hex").slice(0, 8);
      const backupPath = join(BACKUP_ROOT, `artist_${mainSlug}_${Date.now()}_${hash}.json`);
      await mkdir(BACKUP_ROOT, { recursive: true });
      await copyFile(relPath, backupPath);
      await writeFile(relPath, JSON.stringify(rel, null, 2), "utf-8");
      artistUpdates++;
    }
  }

  console.log(`  ✅ Updated ${artistUpdates} artists (+${collabEdgesAdded} new collab edges)\n`);

  console.log("━━━ SUMMARY ━━━");
  console.log(`  📊 Feat matched: ${matchedFeats}/${totalFeats}`);
  console.log(`  📀 Albums updated: ${albumUpdates} (+${albumEdgesAdded} feat artist edges)`);
  console.log(`  🎤 Artists updated: ${artistUpdates} (+${collabEdgesAdded} collab edges)`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});