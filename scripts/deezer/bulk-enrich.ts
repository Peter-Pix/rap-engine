/**
 * Deezer bulk enrichment.
 *
 * Načte všechna matchnutá alba z deezer-index.json a spustí enrichment.
 * Přeskočí alba, která už mají tracks.json.
 *
 * Použití:
 *   npx tsx bulk-enrich.ts              # enrich všechna matchnutá alba
 *   npx tsx bulk-enrich.ts --dry-run    # náhled bez zápisu
 *   npx tsx bulk-enrich.ts --limit 50   # max 50 alb (pro test)
 *   npx tsx bulk-enrich.ts --force      # přepsat existující tracks.json
 */

import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createHash } from "crypto";
import { readdir, copyFile, mkdir } from "fs/promises";

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
  const res = await rateLimitedFetch(`${DEEZER_BASE}${path}`);
  if (!res.ok) throw new Error(`Deezer ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  track_position: number;
  contributors?: { id: number; name: string; role: string }[];
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
  contributors?: { id: number; name: string; role: string }[];
}

function parseFeat(title: string): { cleanTitle: string; feat: string[] } {
  const patterns = [
    /\s*\((?:feat\.?|ft\.?|featuring)\s+([^)]+)\)/gi,
    /\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/gi,
  ];
  let cleanTitle = title;
  const featArtists = new Set<string>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(title)) !== null) {
      match[1].split(/\s*[&,]\s*|\s+and\s+/i).forEach((p) => {
        const t = p.trim();
        if (t) featArtists.add(t);
      });
    }
    if (featArtists.size > 0) {
      cleanTitle = title.replace(pattern, "").trim();
      break;
    }
  }
  return { cleanTitle: cleanTitle || title, feat: Array.from(featArtists) };
}

function slugifyGenre(g: string): string {
  return g
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function backup(slug: string) {
  const metaPath = join(CONTENT_ROOT, `album_${slug}`, "meta.json");
  if (!existsSync(metaPath)) return null;
  const meta = JSON.parse(await readFile(metaPath, "utf-8"));
  await mkdir(BACKUP_ROOT, { recursive: true });
  const hash = createHash("md5").update(JSON.stringify(meta)).digest("hex").slice(0, 8);
  const backupPath = join(BACKUP_ROOT, `${slug}_${Date.now()}_${hash}.json`);
  await copyFile(metaPath, backupPath);
  return backupPath;
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

interface Stats {
  success: number;
  skipped: number;
  failed: number;
  totalTracks: number;
  totalFeat: number;
}

async function enrichOne(slug: string, deezerId: number, force: boolean, dryRun: boolean): Promise<{ ok: boolean; tracks: number; feat: number; skipped?: boolean; error?: string }> {
  const tracksPath = join(CONTENT_ROOT, `album_${slug}`, "tracks.json");
  if (existsSync(tracksPath) && !force) {
    return { ok: true, tracks: 0, feat: 0, skipped: true };
  }

  try {
    const detail = await deezer<DeezerAlbumDetail>(`/album/${deezerId}`);
    const tracks = await fetchAllTracks(deezerId, detail.nb_tracks);

    let featCount = 0;
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
        const titleFeat = parseFeat(t.title);
        const contribFeat = (t.contributors || []).filter((c) => c.role === "Featuring").map((c) => c.name);
        const allFeat = Array.from(new Set([...titleFeat.feat, ...contribFeat]));
        if (allFeat.length > 0) featCount++;
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

    if (dryRun) {
      return { ok: true, tracks: enriched.total_tracks, feat: featCount };
    }

    await writeFile(tracksPath, JSON.stringify(enriched, null, 2), "utf-8");

    // Update meta.json
    const metaPath = join(CONTENT_ROOT, `album_${slug}`, "meta.json");
    if (existsSync(metaPath)) {
      await backup(slug);
      const meta = JSON.parse(await readFile(metaPath, "utf-8"));
      if (!meta.trackCount) meta.trackCount = enriched.total_tracks;
      if (!meta.durationSec) meta.durationSec = enriched.total_duration_sec;
      if (!meta.deezerId) meta.deezerId = detail.id;
      if (!meta.publishedAt && enriched.release_date) meta.publishedAt = enriched.release_date;
      if (enriched.label && !meta.label) meta.label = enriched.label;
      if (enriched.upc && !meta.upc) meta.upc = enriched.upc;
      if (enriched.genres?.length && !meta.genres?.length) {
        meta.genres = enriched.genres.map(slugifyGenre);
      }
      if (enriched.cover_xl && (!meta.image || meta.image.includes("placeholder"))) {
        meta.image = enriched.cover_xl;
      }
      if (!meta.sourceUrls) meta.sourceUrls = {};
      if (!meta.sourceUrls.deezer) meta.sourceUrls.deezer = `https://www.deezer.com/album/${detail.id}`;
      await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
    }

    return { ok: true, tracks: enriched.total_tracks, feat: featCount };
  } catch (e) {
    return { ok: false, tracks: 0, feat: 0, error: (e as Error).message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;

  // Load index
  const indexPath = join(CACHE_ROOT, "deezer-index.json");
  if (!existsSync(indexPath)) {
    console.error("❌ deezer-index.json not found. Run build-index first.");
    process.exit(1);
  }
  const index = JSON.parse(await readFile(indexPath, "utf-8"));
  const allSlugs = Object.keys(index.albums);

  console.log(`🎵 Deezer bulk enrichment${dryRun ? " (DRY RUN)" : ""}${force ? " (FORCE)" : ""}`);
  console.log(`   Total matched albums in index: ${allSlugs.length}`);

  // Filter: skip if exists (unless force)
  let toProcess = allSlugs;
  if (!force) {
    toProcess = allSlugs.filter((slug) => {
      const tracksPath = join(CONTENT_ROOT, `album_${slug}`, "tracks.json");
      return !existsSync(tracksPath);
    });
    console.log(`   Already done (skipping): ${allSlugs.length - toProcess.length}`);
  }
  console.log(`   To process: ${toProcess.length}`);
  if (limit < toProcess.length) {
    toProcess = toProcess.slice(0, limit);
    console.log(`   Limited to: ${toProcess.length}`);
  }
  console.log();

  const stats: Stats = { success: 0, skipped: 0, failed: 0, totalTracks: 0, totalFeat: 0 };
  const start = Date.now();

  for (let i = 0; i < toProcess.length; i++) {
    const slug = toProcess[i];
    const entry = index.albums[slug];
    const pct = ((i / toProcess.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);

    process.stdout.write(`  [${pct}%] (${elapsed}min) ${slug} (${entry.deezer_id})... `);

    const result = await enrichOne(slug, entry.deezer_id, force, dryRun);

    if (result.skipped) {
      stats.skipped++;
      process.stdout.write(`⏭️  skipped\n`);
    } else if (result.ok) {
      stats.success++;
      stats.totalTracks += result.tracks;
      stats.totalFeat += result.feat;
      process.stdout.write(`✅ ${result.tracks} tracks (${result.feat} feat)\n`);
    } else {
      stats.failed++;
      process.stdout.write(`❌ ${result.error}\n`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(2);
  console.log(`\n━━━ SUMMARY ━━━`);
  console.log(`  ✅ Success: ${stats.success}`);
  console.log(`  ⏭️  Skipped: ${stats.skipped}`);
  console.log(`  ❌ Failed: ${stats.failed}`);
  console.log(`  📊 Total tracks written: ${stats.totalTracks}`);
  console.log(`  🎤 Tracks with feat: ${stats.totalFeat}`);
  console.log(`  ⏱️  Elapsed: ${elapsed} min`);
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});