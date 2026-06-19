/**
 * Deezer album enrichment (pilot).
 *
 * Pro daný RKG album slug:
 *  1. Načte deezer-index.json
 *  2. Najde deezer_id pro dané album
 *  3. Stáhne /album/{id}/tracks
 *  4. Vytvoří content/entities/album_{slug}/tracks.json
 *  5. Přidá trackCount/durationSec do meta.json (pouze pokud chybí)
 *
 * APPEND-ONLY: nikdy nepřepisuje existující tracks.json.
 * Při prvním spuštění vytvoří zálohu meta.json.
 */

import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createHash } from "crypto";

const DEEZER_BASE = "https://api.deezer.com";
const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const CACHE_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.content-cache";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/deezer";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRequest = 0;
async function rateLimitedFetch(url: string): Promise<Response> {
  const elapsed = Date.now() - lastRequest;
  if (elapsed < 150) await sleep(150 - elapsed);
  lastRequest = Date.now();
  return fetch(url);
}

async function deezer<T>(path: string): Promise<T> {
  const url = `${DEEZER_BASE}${path}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`Deezer ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  track_position: number;
  contributors: { id: number; name: string; role: string }[];
  artist: { id: number; name: string };
  isrc?: string;
  link?: string;
}

interface DeezerIndex {
  albums: Record<string, {
    deezer_id: number;
    deezer_title: string;
    release_date: string;
    cover: string | null;
    nb_tracks: number;
    duration_sec: number;
    deezer_artist_id: number;
    deezer_artist_name: string;
    match_type: string;
  }>;
}

async function backup(albumSlug: string, meta: any) {
  await mkdir(BACKUP_ROOT, { recursive: true });
  const metaPath = join(CONTENT_ROOT, `album_${albumSlug}`, "meta.json");
  if (existsSync(metaPath)) {
    const hash = createHash("md5").update(JSON.stringify(meta)).digest("hex").slice(0, 8);
    const backupPath = join(BACKUP_ROOT, `${albumSlug}_${Date.now()}_${hash}.json`);
    await copyFile(metaPath, backupPath);
    return backupPath;
  }
  return null;
}

async function enrichAlbum(albumSlug: string, dryRun = false) {
  console.log(`\n━━━ ${albumSlug} ━━━`);

  // 1. Load index
  const indexPath = join(CACHE_ROOT, "deezer-index.json");
  if (!existsSync(indexPath)) {
    console.error(`  ❌ deezer-index.json not found. Run build-index first.`);
    return;
  }
  const index: DeezerIndex = JSON.parse(await readFile(indexPath, "utf-8"));
  const entry = index.albums[albumSlug];

  if (!entry) {
    console.error(`  ❌ Album "${albumSlug}" not in Deezer index.`);
    return;
  }

  console.log(`  ✅ Deezer match: "${entry.deezer_title}" (id=${entry.deezer_id}, ${entry.match_type})`);
  console.log(`     ${entry.nb_tracks} tracks, ${entry.duration_sec}s, released ${entry.release_date}`);

  // 2. Check if tracks.json already exists
  const tracksPath = join(CONTENT_ROOT, `album_${albumSlug}`, "tracks.json");
  if (existsSync(tracksPath)) {
    console.log(`  ⚠️  tracks.json already exists — skipping (append-only mode)`);
    return;
  }

  // 3. Fetch tracks
  const tracksRes = await deezer<{ data: DeezerTrack[] }>(`/album/${entry.deezer_id}/tracks`);
  const tracks = tracksRes.data;
  console.log(`  🎵 Fetched ${tracks.length} tracks`);

  // 4. Parse + structure
  const enriched = {
    source: "deezer",
    source_id: entry.deezer_id,
    fetched_at: new Date().toISOString(),
    total_tracks: tracks.length,
    total_duration_sec: tracks.reduce((sum, t) => sum + (t.duration || 0), 0),
    tracks: tracks.map((t) => {
      const featArtists = (t.contributors || [])
        .filter((c) => c.role === "Featuring")
        .map((c) => c.name);
      const mainArtists = (t.contributors || [])
        .filter((c) => c.role === "Main")
        .map((c) => c.name);
      return {
        position: t.track_position,
        title: t.title,
        duration_sec: t.duration,
        artists: t.artist?.name ? [t.artist.name, ...mainArtists.filter((n) => n !== t.artist.name)] : mainArtists,
        feat: featArtists,
        isrc: t.isrc || null,
        link: t.link || `https://www.deezer.com/track/${t.id}`,
      };
    }),
  };

  // 5. Build tracks.json content
  const tracksJson = JSON.stringify(enriched, null, 2);

  if (dryRun) {
    console.log(`  🔍 DRY RUN — would write ${tracksPath}`);
    console.log(`     First 3 tracks:`);
    enriched.tracks.slice(0, 3).forEach((t) => {
      console.log(`       ${t.position}. ${t.title}${t.feat.length ? ` (feat. ${t.feat.join(", ")})` : ""} [${t.duration_sec}s]`);
    });
    return;
  }

  // 6. Backup meta.json if exists
  const metaPath = join(CONTENT_ROOT, `album_${albumSlug}`, "meta.json");
  let metaBackup: string | null = null;
  if (existsSync(metaPath)) {
    const meta = JSON.parse(await readFile(metaPath, "utf-8"));
    metaBackup = await backup(albumSlug, meta);
  }

  // 7. Write tracks.json
  await writeFile(tracksPath, tracksJson, "utf-8");
  console.log(`  💾 Wrote tracks.json (${tracksJson.length} bytes)`);

  // 8. Update meta.json (only add missing fields)
  if (existsSync(metaPath)) {
    const meta = JSON.parse(await readFile(metaPath, "utf-8"));
    let changed = false;

    if (!meta.trackCount) {
      meta.trackCount = enriched.total_tracks;
      changed = true;
    }
    if (!meta.durationSec) {
      meta.durationSec = enriched.total_duration_sec;
      changed = true;
    }
    if (!meta.sourceUrls) meta.sourceUrls = {};
    if (!meta.sourceUrls.deezer) {
      meta.sourceUrls.deezer = `https://www.deezer.com/album/${entry.deezer_id}`;
      changed = true;
    }
    if (!meta.deezerId) {
      meta.deezerId = entry.deezer_id;
      changed = true;
    }

    if (changed) {
      await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
      console.log(`  📝 Updated meta.json: trackCount, durationSec, sourceUrls.deezer`);
      if (metaBackup) console.log(`     Backup: ${metaBackup}`);
    } else {
      console.log(`  ✓ meta.json already has track data — no changes`);
    }
  }

  console.log(`  ✅ Hotovo!`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const slugs = args.filter((a) => !a.startsWith("--"));

  if (slugs.length === 0) {
    console.error("Usage: npx tsx enrich-album.ts [--dry-run] <album-slug> [<album-slug>...]");
    console.error("");
    console.error("Example: npx tsx enrich-album.ts kruhy-vlny neviem krtek-forever");
    process.exit(1);
  }

  console.log(`🎵 Deezer album enrichment${dryRun ? " (DRY RUN)" : ""}\n`);
  console.log(`Albums to process: ${slugs.length}`);

  for (const slug of slugs) {
    try {
      await enrichAlbum(slug, dryRun);
    } catch (e) {
      console.error(`  💥 ${slug}: ${(e as Error).message}`);
    }
  }

  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});