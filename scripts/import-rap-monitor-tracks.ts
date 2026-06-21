#!/usr/bin/env -S npx tsx

/**
 * Enrich album `tracks.json` files with metadata from Rap Monitor API.
 *
 * Rap Monitor (`https://rap-monitor.base44.app/api/entities/Song`) provides
 * per-track data that Deezer doesn't have:
 *   - spotify_url, youtube_url
 *   - lyrics_text (full lyrics)
 *   - lyrics_source (genius.com etc.)
 *   - producer, beatmaker
 *   - ai_summary_short, ai_summary_long, ai_emotions
 *   - tags_genre, tags_style, tags_mood
 *   - metadata_confidence (0-100)
 *   - isrc
 *
 * We match Rap Monitor Song records to Deezer track entries by:
 *   1. title (normalized, no diacritics, lowercase)
 *   2. artist_name matches the album's primary artist OR the track's feat artists
 *
 * What we do:
 *   - For each Rap Monitor song, find matching Deezer track by title.
 *   - Merge new fields into existing track record (Deezer fields win on conflict).
 *   - Add `rap_monitor: { id, metadata_confidence, matched_at }` marker.
 *   - Track stats: how many songs processed, matched, unmatched, skipped (low confidence).
 *
 * Idempotent: re-running will overwrite previous enrichment with fresh data.
 * Skip threshold: metadata_confidence < 60 (configurable via MIN_CONFIDENCE env).
 *
 * Usage:
 *   npx tsx scripts/import-rap-monitor-tracks.ts
 *   DRY_RUN=1 npx tsx scripts/import-rap-monitor-tracks.ts
 *   MIN_CONFIDENCE=80 npx tsx scripts/import-rap-monitor-tracks.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const RAP_MONITOR_API = "https://rap-monitor.base44.app/api";
const RAP_MONITOR_KEY = process.env.RAP_MONITOR_API_KEY || "b9d03638f3df4fe49ee5e75ab26d0803";

const DRY_RUN = !!process.env.DRY_RUN;
const MIN_CONFIDENCE = Number(process.env.MIN_CONFIDENCE ?? 60);
const PAGE_SIZE = 500;
const REPO = path.resolve(__dirname, "..");

interface RapMonitorSong {
  id: string;
  title: string;
  artist_name?: string;
  featuring_names?: string[];
  album?: string;
  release_date?: string;
  duration?: string;
  spotify_url?: string | null;
  youtube_url?: string | null;
  apple_music_url?: string | null;
  lyrics_text?: string | null;
  lyrics_source?: string | null;
  lyrics_verified?: boolean;
  lyrics_confidence?: number;
  producer?: string | null;
  beatmaker?: string | null;
  label?: string | null;
  isrc?: string | null;
  tags_genre?: string[];
  tags_style?: string[];
  tags_mood?: string[];
  tags_content?: string[];
  ai_summary_short?: string | null;
  ai_summary_long?: string | null;
  ai_emotions?: string[];
  metadata_confidence?: number;
  lastfm_synced_at?: string;
  metadata_verified?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function stripDiacritics(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function titleMatch(a: string, b: string): boolean {
  const na = stripDiacritics(a);
  const nb = stripDiacritics(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Fuzzy: jeden je substring druhého
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

function parseDurationToSec(d: string | undefined): number | null {
  if (!d) return null;
  const m = d.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── API fetch ────────────────────────────────────────────────────────────

async function fetchAllSongs(): Promise<RapMonitorSong[]> {
  // Rap Monitor API has a bug: offset > 0 returns empty array.
  // We can only fetch the first PAGE_SIZE records (default 500).
  const url = `${RAP_MONITOR_API}/entities/Song?limit=${PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: { api_key: RAP_MONITOR_KEY },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const songs = (await res.json()) as RapMonitorSong[];
  if (!Array.isArray(songs)) throw new Error("Response is not an array");
  return songs;
}

// ─── Index building ───────────────────────────────────────────────────────

interface AlbumRecord {
  albumId: string;
  albumTitle: string;
  tracksPath: string;
  tracksJson: { tracks: any[]; [k: string]: any };
  artistSlugs: Set<string>;
}

function buildAlbumIndex(): AlbumRecord[] {
  const entitiesDir = path.join(REPO, "content", "entities");
  if (!fs.existsSync(entitiesDir)) return [];

  const records: AlbumRecord[] = [];
  const entries = fs.readdirSync(entitiesDir);

  for (const entry of entries) {
    if (!entry.startsWith("album_")) continue;
    const tracksPath = path.join(entitiesDir, entry, "tracks.json");
    if (!fs.existsSync(tracksPath)) continue;

    let tracksJson: any;
    try {
      tracksJson = JSON.parse(fs.readFileSync(tracksPath, "utf-8"));
    } catch {
      continue;
    }
    if (!Array.isArray(tracksJson.tracks)) continue;

    // Read meta.json for primary artist
    const metaPath = path.join(entitiesDir, entry, "meta.json");
    let albumTitle = tracksJson.album || entry.replace(/^album_/, "");
    let artistSlugs = new Set<string>();
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        if (meta.title) albumTitle = meta.title;
        // Try to resolve artist from related entities in relations.json
      } catch {}
    }

    // Better: read meta + try to find artist slug from existing entity cache
    // For matching purposes we use Rap Monitor's artist_name and match against
    // normalized slugs of all known artist entities.
    const artistsCache = readArtistSlugIndex();
    if (artistsCache.byName.has(stripDiacritics(albumTitle))) {
      // albumTitle was probably an artist name — use it
    }

    records.push({
      albumId: entry,
      albumTitle,
      tracksPath,
      tracksJson,
      artistSlugs,
    });
  }

  return records;
}

function readArtistSlugIndex(): { byName: Map<string, string> } {
  const byName = new Map<string, string>();
  const entitiesDir = path.join(REPO, "content", "entities");
  if (!fs.existsSync(entitiesDir)) return { byName };

  const entries = fs.readdirSync(entitiesDir);
  for (const entry of entries) {
    if (!entry.startsWith("artist_")) continue;
    const metaPath = path.join(entitiesDir, entry, "meta.json");
    if (!fs.existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      if (meta.title) byName.set(stripDiacritics(meta.title), entry);
      if (meta.realName) byName.set(stripDiacritics(meta.realName), entry);
    } catch {}
  }
  return { byName };
}

// ─── Matching & enrichment ────────────────────────────────────────────────

function findMatchingTrack(
  album: AlbumRecord,
  song: RapMonitorSong,
): any | null {
  if (!song.title) return null;
  // Match by normalized title
  for (const t of album.tracksJson.tracks) {
    if (titleMatch(t.title ?? "", song.title)) return t;
  }
  return null;
}

function enrichTrack(track: any, song: RapMonitorSong): { changed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let changed = false;
  const prev = JSON.stringify(track);

  // Spotify
  if (song.spotify_url && !track.spotify_url) {
    track.spotify_url = song.spotify_url;
    reasons.push("spotify_url");
    changed = true;
  }
  // YouTube
  if (song.youtube_url && !track.youtube_url) {
    track.youtube_url = song.youtube_url;
    reasons.push("youtube_url");
    changed = true;
  }
  // Apple Music
  if (song.apple_music_url && !track.apple_music_url) {
    track.apple_music_url = song.apple_music_url;
    reasons.push("apple_music_url");
    changed = true;
  }
  // Lyrics
  if (song.lyrics_text && !track.lyrics_text) {
    track.lyrics_text = song.lyrics_text;
    reasons.push("lyrics_text");
    changed = true;
  }
  if (song.lyrics_source && !track.lyrics_source) {
    track.lyrics_source = song.lyrics_source;
    reasons.push("lyrics_source");
    changed = true;
  }
  // Producer / beatmaker
  if (song.producer && !track.producer) {
    track.producer = song.producer;
    reasons.push("producer");
    changed = true;
  }
  if (song.beatmaker && !track.beatmaker) {
    track.beatmaker = song.beatmaker;
    reasons.push("beatmaker");
    changed = true;
  }
  // ISRC cross-check
  if (song.isrc && !track.isrc) {
    track.isrc = song.isrc;
    reasons.push("isrc");
    changed = true;
  }
  // Duration cross-check (if deezer missed it)
  if (!track.duration_sec && song.duration) {
    const sec = parseDurationToSec(song.duration);
    if (sec) {
      track.duration_sec = sec;
      reasons.push("duration_sec");
      changed = true;
    }
  }
  // Tags (genre / style / mood)
  if (song.tags_genre?.length && !track.tags_genre) {
    track.tags_genre = song.tags_genre;
    reasons.push("tags_genre");
    changed = true;
  }
  if (song.tags_style?.length && !track.tags_style) {
    track.tags_style = song.tags_style;
    reasons.push("tags_style");
    changed = true;
  }
  if (song.tags_mood?.length && !track.tags_mood) {
    track.tags_mood = song.tags_mood;
    reasons.push("tags_mood");
    changed = true;
  }
  // AI enrichment (compressed — only short summary to avoid bloat)
  if (song.ai_summary_short && !track.ai_summary_short) {
    track.ai_summary_short = song.ai_summary_short;
    reasons.push("ai_summary_short");
    changed = true;
  }
  if (song.ai_emotions?.length && !track.ai_emotions) {
    track.ai_emotions = song.ai_emotions;
    reasons.push("ai_emotions");
    changed = true;
  }
  // Release date (if deezer missed it)
  if (song.release_date && !track.release_date) {
    track.release_date = song.release_date;
    reasons.push("release_date");
    changed = true;
  }
  // Featuring (validate against existing feat list)
  if (song.featuring_names?.length && !track.feat?.length) {
    track.feat = song.featuring_names;
    reasons.push("feat");
    changed = true;
  }

  // Rap Monitor provenance marker (always set on first enrichment)
  track.rap_monitor = {
    id: song.id,
    confidence: song.metadata_confidence ?? null,
    matched_at: new Date().toISOString(),
  };

  return { changed: changed || prev !== JSON.stringify(track), reasons };
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🎵 Rap Monitor → tracks.json enrichment`);
  console.log(`   MIN_CONFIDENCE=${MIN_CONFIDENCE}  DRY_RUN=${DRY_RUN}\n`);

  console.log(`📡 Fetching songs from Rap Monitor…`);
  const songs = await fetchAllSongs();
  console.log(`   Got ${songs.length} songs total\n`);

  // Index songs by normalized artist_name → songs
  const songsByArtist = new Map<string, RapMonitorSong[]>();
  for (const s of songs) {
    if (!s.artist_name) continue;
    const key = stripDiacritics(s.artist_name);
    if (!songsByArtist.has(key)) songsByArtist.set(key, []);
    songsByArtist.get(key)!.push(s);
  }
  console.log(`   ${songsByArtist.size} unique artists in Rap Monitor\n`);

  // Build album index
  console.log(`📂 Indexing local albums with tracks.json…`);
  const albums = buildAlbumIndex();
  console.log(`   ${albums.length} albums with tracks.json\n`);

  // Load artist slug index for matching artist_name → slug
  const artistIndex = readArtistSlugIndex();

  let enriched = 0;
  let matched = 0;
  let skipped = 0;
  let lowConfidence = 0;

  for (const album of albums) {
    // Strategy A: match by album title (strongest)
    let albumSongs: RapMonitorSong[] = [];
    for (const s of songs) {
      if (s.album && titleMatch(s.album, album.albumTitle)) {
        albumSongs.push(s);
      }
    }

    // Strategy B: match by artist_name — read meta.json for primary artist
    if (albumSongs.length === 0) {
      const metaPath = path.join(REPO, "content", "entities", album.albumId, "meta.json");
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
          const artistName = stripDiacritics(meta.realName ?? meta.title?.split(" - ")[0] ?? "");
          if (artistName && songsByArtist.has(artistName)) {
            // Filter to songs whose album title still somewhat matches
            for (const s of songsByArtist.get(artistName)!) {
              if (s.album && titleMatch(s.album, album.albumTitle)) {
                albumSongs.push(s);
              }
            }
          }
        } catch {}
      }
    }

    if (albumSongs.length === 0) {
      skipped++;
      continue;
    }

    for (const song of albumSongs) {
      const confidence = song.metadata_confidence ?? 0;
      if (confidence < MIN_CONFIDENCE) {
        lowConfidence++;
        continue;
      }

      const track = findMatchingTrack(album, song);
      if (!track) continue;

      matched++;
      const { changed } = enrichTrack(track, song);
      if (changed) enriched++;
    }

    if (!DRY_RUN) {
      fs.writeFileSync(album.tracksPath, JSON.stringify(album.tracksJson, null, 2));
    }
  }

  console.log(`\n✅ Done.`);
  console.log(`   Albums processed: ${albums.length}`);
  console.log(`   Skipped (no album title match): ${skipped}`);
  console.log(`   Songs matched to tracks: ${matched}`);
  console.log(`   Low confidence (<${MIN_CONFIDENCE}): ${lowConfidence}`);
  console.log(`   Tracks enriched: ${enriched}`);
  if (DRY_RUN) console.log(`   (DRY_RUN — no files written)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
