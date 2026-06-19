/**
 * Deezer album enrichment (v2 — s feat parsing, release_date, pagination).
 *
 * Pro daný RKG album slug:
 *  1. Načte deezer-index.json
 *  2. Najde deezer_id pro dané album
 *  3. Fetchne /album/{id} (metadata: release_date, label, contributors, genres, upc)
 *  4. Fetchne /album/{id}/tracks (paginovaně — pro alba > 25 tracks)
 *  5. Parsuje feat z titulu (regex feat./ft./featuring)
 *  6. Vytvoří content/entities/album_{slug}/tracks.json
 *  7. Přidá metadata do meta.json (append-only, backup)
 *
 * APPEND-ONLY: nikdy nepřepisuje existující tracks.json.
 *   Pokud existuje, přeskočí (nebo --force pro rewrite).
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
  title_short?: string;
  title_version?: string;
  duration: number;
  track_position: number;
  disk_number?: number;
  contributors?: { id: number; name: string; role: string; picture?: string }[];
  artist: { id: number; name: string };
  isrc?: string;
  link?: string;
  preview?: string;
  explicit_lyrics?: boolean;
}

interface DeezerAlbumDetail {
  id: number;
  title: string;
  release_date: string;
  duration: number;
  nb_tracks: number;
  cover_xl?: string;
  cover_big?: string;
  label?: string;
  upc?: string;
  genres?: { data: { id: number; name: string }[] };
  contributors?: { id: number; name: string; role: string; picture?: string }[];
  artist: { id: number; name: string };
}

interface DeezerIndex {
  albums: Record<string, {
    deezer_id: number;
    deezer_title: string;
    release_date?: string;
    cover?: string | null;
    nb_tracks: number;
    duration_sec?: number;
    deezer_artist_id: number;
    deezer_artist_name: string;
    match_type: string;
  }>;
}

// Parse "feat. X", "ft. Y", "featuring Z" from title
function parseFeat(title: string): { cleanTitle: string; feat: string[] } {
  // Patterns: "Title feat. Artist", "Title (feat. Artist)", "Title ft. Artist", "Title featuring Artist"
  // Multiple artists: "feat. A & B"
  const patterns = [
    /\s*\((?:feat\.?|ft\.?|featuring)\s+([^)]+)\)/gi,
    /\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/gi,
  ];

  let cleanTitle = title;
  const featArtists = new Set<string>();

  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(title)) !== null) {
      // Split by " & ", ", ", " and "
      const parts = match[1].split(/\s*[&,]\s*|\s+and\s+/i);
      parts.forEach((p) => {
        const trimmed = p.trim();
        if (trimmed) featArtists.add(trimmed);
      });
    }
    if (featArtists.size > 0) {
      // Remove feat portion from title
      cleanTitle = title.replace(pattern, "").trim();
      break;
    }
  }

  return {
    cleanTitle: cleanTitle || title,
    feat: Array.from(featArtists),
  };
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

async function fetchAllTracks(albumId: number, expectedNb: number): Promise<DeezerTrack[]> {
  const all: DeezerTrack[] = [];
  let index = 0;
  const limit = 50;

  while (all.length < expectedNb) {
    const res = await deezer<{ data: DeezerTrack[]; next?: string }>(
      `/album/${albumId}/tracks?limit=${limit}&index=${index}`
    );
    all.push(...res.data);
    if (!res.next || res.data.length === 0) break;
    index += limit;
  }

  return all;
}

async function enrichAlbum(albumSlug: string, options: { dryRun?: boolean; force?: boolean } = {}) {
  const { dryRun = false, force = false } = options;
  console.log(`\n━━━ ${albumSlug}${dryRun ? " (DRY RUN)" : ""}${force ? " (FORCE)" : ""} ━━━`);

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

  console.log(`  ✅ Deezer: "${entry.deezer_title}" (id=${entry.deezer_id}, ${entry.match_type})`);

  // 2. Skip if already exists (unless --force)
  const tracksPath = join(CONTENT_ROOT, `album_${albumSlug}`, "tracks.json");
  if (existsSync(tracksPath) && !force) {
    console.log(`  ⚠️  tracks.json already exists — skipping (use --force to rewrite)`);
    return;
  }

  // 3. Fetch album detail
  const detail = await deezer<DeezerAlbumDetail>(`/album/${entry.deezer_id}`);
  console.log(`     ${detail.nb_tracks} tracks, ${Math.floor(detail.duration / 60)}min, released ${detail.release_date}`);
  if (detail.label) console.log(`     Label: ${detail.label}`);
  if (detail.genres?.data?.length) console.log(`     Genre: ${detail.genres.data.map((g) => g.name).join(", ")}`);

  // 4. Fetch all tracks (paginated)
  const tracks = await fetchAllTracks(entry.deezer_id, detail.nb_tracks);
  console.log(`  🎵 Fetched ${tracks.length}/${detail.nb_tracks} tracks`);

  // 5. Parse + structure
  let featCount = 0;
  let contribCount = 0;
  const enriched = {
    source: "deezer",
    source_id: detail.id,
    fetched_at: new Date().toISOString(),
    release_date: detail.release_date,
    label: detail.label || null,
    upc: detail.upc || null,
    total_tracks: tracks.length,
    total_duration_sec: tracks.reduce((sum, t) => sum + (t.duration || 0), 0),
    contributors: (detail.contributors || []).map((c) => ({ name: c.name, role: c.role })),
    genres: (detail.genres?.data || []).map((g) => g.name),
    cover_xl: detail.cover_xl || detail.cover_big || null,
    tracks: tracks.map((t) => {
      // Combine feat from title and contributors
      const titleFeat = parseFeat(t.title);
      const contribFeat = (t.contributors || [])
        .filter((c) => c.role === "Featuring")
        .map((c) => c.name);
      const allFeat = Array.from(new Set([...titleFeat.feat, ...contribFeat]));

      if (allFeat.length > 0) featCount++;
      if (t.contributors && t.contributors.length > 0) contribCount++;

      return {
        position: t.track_position,
        title: titleFeat.cleanTitle,
        title_original: t.title,
        duration_sec: t.duration,
        artists: t.artist?.name ? [t.artist.name] : [],
        feat: allFeat,
        isrc: t.isrc || null,
        link: t.link || `https://www.deezer.com/track/${t.id}`,
        preview_url: t.preview || null,
        explicit: t.explicit_lyrics || false,
      };
    }),
  };

  console.log(`     Parsed feat from ${featCount} tracks (${contribCount} had contributors)`);

  // 6. Dry run
  if (dryRun) {
    console.log(`  🔍 DRY RUN — would write:`);
    console.log(`     ${tracksPath}`);
    console.log(`     First 5 tracks:`);
    enriched.tracks.slice(0, 5).forEach((t) => {
      const feat = t.feat.length ? ` (feat. ${t.feat.join(", ")})` : "";
      console.log(`       ${t.position}. ${t.title}${feat} [${t.duration_sec}s]`);
    });
    return;
  }

  // 7. Backup meta.json if exists
  const metaPath = join(CONTENT_ROOT, `album_${albumSlug}`, "meta.json");
  let metaBackup: string | null = null;
  if (existsSync(metaPath)) {
    const meta = JSON.parse(await readFile(metaPath, "utf-8"));
    metaBackup = await backup(albumSlug, meta);
  }

  // 8. Write tracks.json
  await writeFile(tracksPath, JSON.stringify(enriched, null, 2), "utf-8");
  console.log(`  💾 Wrote tracks.json (${JSON.stringify(enriched).length} bytes)`);

  // 9. Update meta.json (only add missing fields)
  if (existsSync(metaPath)) {
    const meta = JSON.parse(await readFile(metaPath, "utf-8"));
    let changed = false;

    // Core data
    if (!meta.trackCount) {
      meta.trackCount = enriched.total_tracks;
      changed = true;
    }
    if (!meta.durationSec) {
      meta.durationSec = enriched.total_duration_sec;
      changed = true;
    }
    if (!meta.deezerId) {
      meta.deezerId = entry.deezer_id;
      changed = true;
    }

    // Release date (prefer RKG's if exists, else from Deezer)
    if (!meta.publishedAt && enriched.release_date) {
      meta.publishedAt = enriched.release_date;
      changed = true;
    }

    // Label
    if (enriched.label && !meta.label) {
      meta.label = enriched.label;
      changed = true;
    }

    // UPC
    if (enriched.upc && !meta.upc) {
      meta.upc = enriched.upc;
      changed = true;
    }

    // Genres (add new ones)
    if (enriched.genres?.length && !meta.genres?.length) {
      meta.genres = enriched.genres.map((g) => slugifyGenre(g));
      changed = true;
    }

    // Cover (replace placeholder if exists)
    if (enriched.cover_xl && (!meta.image || meta.image.includes("placeholder"))) {
      meta.image = enriched.cover_xl;
      changed = true;
    }

    // Source URLs
    if (!meta.sourceUrls) meta.sourceUrls = {};
    if (!meta.sourceUrls.deezer) {
      meta.sourceUrls.deezer = `https://www.deezer.com/album/${entry.deezer_id}`;
      changed = true;
    }

    if (changed) {
      await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
      const fields = Object.keys(meta).filter((k) => !["id", "type", "title", "slug"].includes(k));
      console.log(`  📝 Updated meta.json`);
      if (metaBackup) console.log(`     Backup: ${metaBackup}`);
    } else {
      console.log(`  ✓ meta.json already has track data — no changes`);
    }
  }

  console.log(`  ✅ Hotovo!`);
}

function slugifyGenre(g: string): string {
  return g
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const slugs = args.filter((a) => !a.startsWith("--"));

  if (slugs.length === 0) {
    console.error("Usage: npx tsx enrich-album.ts [--dry-run] [--force] <album-slug> [<album-slug>...]");
    console.error("");
    console.error("Examples:");
    console.error("  npx tsx enrich-album.ts kruhy-vlny neviem");
    console.error("  npx tsx enrich-album.ts --dry-run album-slug");
    console.error("  npx tsx enrich-album.ts --force album-slug");
    process.exit(1);
  }

  console.log(`🎵 Deezer album enrichment${dryRun ? " (DRY RUN)" : ""}${force ? " (FORCE)" : ""}\n`);
  console.log(`Albums to process: ${slugs.length}`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const slug of slugs) {
    try {
      const tracksPath = join(CONTENT_ROOT, `album_${slug}`, "tracks.json");
      if (existsSync(tracksPath) && !force) {
        skipped++;
        continue; // already done
      }
      await enrichAlbum(slug, { dryRun, force });
      success++;
    } catch (e) {
      console.error(`  💥 ${slug}: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\n━━━ SUMMARY ━━━`);
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ⏭️  Skipped (already exists): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});