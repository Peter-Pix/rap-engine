#!/usr/bin/env -S npx tsx
/**
 * Batch import RapMonitor complete tracks into knowledge graph entities.
 *
 * Reads .tmp/rapmonitor-all-songs.json, filters complete analysis_status,
 * creates track entity folders with meta.json + entity.mdx + relations.json.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/batch-import-tracks.ts
 *   npx tsx scripts/batch-import-tracks.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveLabel, resolveLabelOrCreate } from "../src/lib/content/label-resolver";

const INPUT = path.resolve(__dirname, "../.tmp/rapmonitor-all-songs.json");
const REPO = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(REPO, "content", "entities");

const DRY_RUN = !!process.env.DRY_RUN;
const MAX_TRACKS = Number(process.env.MAX_TRACKS || Infinity);

interface RapMonitorSong {
  id: string;
  title: string;
  artist_name: string;
  album?: string;
  release_date?: string;
  year?: number;
  duration?: string;
  spotify_url?: string | null;
  youtube_url?: string | null;
  apple_music_url?: string | null;
  lyrics_text?: string | null;
  lyrics_source?: string | null;
  producer?: string | null;
  beatmaker?: string | null;
  label?: string | null;
  featuring_names?: string[];
  isrc?: string | null;
  tags_genre?: string[];
  tags_style?: string[];
  tags_mood?: string[];
  tags_content?: string[];
  ai_summary_short?: string | null;
  ai_summary_long?: string | null;
  ai_main_idea?: string | null;
  ai_message?: string | null;
  ai_story?: string | null;
  ai_atmosphere?: string | null;
  ai_emotions?: string[];
  ai_motifs?: string[];
  ai_analysis?: string | null;
  ai_analysis_rating?: number | null;
  ai_analysis_strengths?: string[];
  ai_analysis_weaknesses?: string[];
  ai_analysis_recommendation?: string | null;
  metadata_confidence?: number;
  analysis_status?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDurationToSec(d: string | undefined): number | null {
  if (!d) return null;
  const m = d.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function findExistingEntity(type: string, name: string): string | null {
  const slug = normalizeSlug(name);
  const entityPath = path.join(CONTENT_DIR, `${type}_${slug}`);
  if (fs.existsSync(entityPath)) return `${type}_${slug}`;
  return null;
}

function findExistingArtist(name: string): string | null {
  return findExistingEntity("artist", name) || findExistingEntity("producer", name);
}

function findExistingAlbum(name: string): string | null {
  return findExistingEntity("album", name);
}

function findExistingLabel(name: string): string | null {
  // Use canonical label resolver to prevent duplicate creation
  return resolveLabel(name);
}

// Map RapMonitor tags to our taxonomy
function mapGenre(tag: string): string | null {
  const mapping: Record<string, string> = {
    "trap": "genre_trap",
    "boom bap": "genre_boom-bap",
    "cloud rap": "genre_cloud-rap",
    "conscious rap": "genre_conscious-rap",
    "drill": "genre_drill",
    "emo rap": "genre_emo-rap",
    "grime": "genre_grime",
    "lo-fi": "genre_lo-fi-rap",
    "melodic rap": "genre_melodic-rap",
    "new school": "genre_newschool-rap",
    "old school": "genre_old-school-rap",
    "phonk": "genre_phonk",
    "pop rap": "genre_pop-rap",
    "rage": "genre_rage",
  };
  return mapping[normalizeSlug(tag)] || null;
}

function mapStyle(tag: string): string | null {
  const mapping: Record<string, string> = {
    "autotune": "style_melodic",
    "battle rap": "style_aggressive",
    "conscious": "style_conscious",
    "experimentální": "style_experimental",
    "freestyle": "style_street",
    "introspektivní": "style_introspective",
    "melodický": "style_melodic",
    "storytelling": "style_introspective",
  };
  return mapping[normalizeSlug(tag)] || null;
}

function mapMood(tag: string): string | null {
  // Normalize diacritics for matching
  const normalized = tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const mapping: Record<string, string> = {
    "agresivni": "mood_aggressive",
    "energeticka": "mood_confident",
    "energicka": "mood_confident",
    "hrava": "mood_chill",
    "klubova": "mood_club",
    "melancholicka": "mood_melancholic",
    "motivacni": "mood_positive",
    "nostalgicka": "mood_atmospheric",
    "osobni": "mood_emotional",
    "relaxacni": "mood_chill",
    "temna": "mood_dark",
  };
  return mapping[normalized] || null;
}

function mapTheme(tag: string): string | null {
  const normalized = tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const mapping: Record<string, string> = {
    "deprese": "theme_life",
    "drogy": "theme_street-life",
    "flex": "theme_flex",
    "humor": "theme_lifestyle",
    "party": "theme_lifestyle",
    "penize": "theme_success",
    "politika": "theme_society",
    "rodina": "theme_relationships",
    "sebereflexe": "theme_self-reflection",
    "spolecnost": "theme_society",
    "ulice": "theme_street-life",
    "vztahy": "theme_relationships",
    "uspch": "theme_success",
    "zivotni pribeh": "theme_life",
  };
  return mapping[normalized] || null;
}

// ─── Build entity.mdx ─────────────────────────────────────────────────────

function buildEntityMdx(song: RapMonitorSong): string {
  const sections: string[] = [];

  // O čem je
  const mainContent = song.ai_summary_long || song.ai_summary_short || song.ai_main_idea || "";
  if (mainContent) {
    sections.push(`## O čem je\n\n${mainContent.trim()}`);
  }

  // Kontext
  const contextParts: string[] = [];
  if (song.album && !song.album.includes("Single")) {
    contextParts.push(`Skladba vyšla na albu *${song.album}*.`);
  }
  if (song.release_date || song.year) {
    const year = song.year || (song.release_date ? new Date(song.release_date).getFullYear() : null);
    if (year) contextParts.push(`Rok vydání: ${year}.`);
  }
  if (contextParts.length > 0) {
    sections.push(`## Kontext\n\n${contextParts.join(" ")}`);
  }

  // Produkce
  const prodParts: string[] = [];
  if (song.producer) prodParts.push(`Producent: ${song.producer}.`);
  if (song.beatmaker) prodParts.push(`Beatmaker: ${song.beatmaker}.`);
  if (song.ai_atmosphere) prodParts.push(`Atmosféra: ${song.ai_atmosphere}`);
  if (prodParts.length > 0) {
    sections.push(`## Produkce\n\n${prodParts.join(" ")}`);
  }

  // Interpretace
  if (song.ai_analysis) {
    sections.push(`## Interpretace\n\n${song.ai_analysis.trim()}`);
  }

  // Dopad
  if (song.ai_message || song.ai_analysis_recommendation) {
    const dopad = song.ai_message || song.ai_analysis_recommendation || "";
    sections.push(`## Dopad\n\n${dopad.trim()}`);
  }

  return sections.join("\n\n");
}

// ─── Build relations.json ─────────────────────────────────────────────────

function buildRelations(song: RapMonitorSong): Record<string, any> {
  const rels: Record<string, any> = {
    primaryArtist: [],
    belongsToAlbum: [],
    producers: [],
    featuring: [],
    labels: [],
    genres: [],
    styles: [],
    themes: [],
    moods: [],
    related: [],
  };

  // Primary artist
  const artistId = findExistingArtist(song.artist_name);
  if (artistId) rels.primaryArtist = [artistId];

  // Album
  if (song.album && !song.album.includes("Single") && !song.album.includes("EP")) {
    const albumId = findExistingAlbum(song.album);
    if (albumId) rels.belongsToAlbum = [albumId];
  }

  // Producers
  if (song.producer) {
    const producers = song.producer.split(/,\s*/).map((p) => p.trim());
    for (const p of producers) {
      const pid = findExistingArtist(p) || findExistingEntity("producer", p);
      if (pid) rels.producers.push(pid);
    }
  }
  if (song.beatmaker) {
    const pid = findExistingArtist(song.beatmaker) || findExistingEntity("producer", song.beatmaker);
    if (pid && !rels.producers.includes(pid)) rels.producers.push(pid);
  }

  // Featuring
  for (const feat of song.featuring_names || []) {
    const fid = findExistingArtist(feat);
    if (fid) rels.featuring.push(fid);
  }

  // Label
  if (song.label) {
    const lid = findExistingLabel(song.label);
    if (lid) rels.labels = [lid];
  }

  // Genres
  for (const tag of song.tags_genre || []) {
    const gid = mapGenre(tag);
    if (gid && !rels.genres.includes(gid)) rels.genres.push(gid);
  }

  // Styles
  for (const tag of song.tags_style || []) {
    const sid = mapStyle(tag);
    if (sid && !rels.styles.includes(sid)) rels.styles.push(sid);
  }

  // Moods
  for (const tag of song.tags_mood || []) {
    const mid = mapMood(tag);
    if (mid && !rels.moods.includes(mid)) rels.moods.push(mid);
  }

  // Themes (from tags_content)
  for (const tag of song.tags_content || []) {
    const tid = mapTheme(tag);
    if (tid && !rels.themes.includes(tid)) rels.themes.push(tid);
  }

  // Emotions → moods
  for (const emo of song.ai_emotions || []) {
    const mid = mapMood(emo);
    if (mid && !rels.moods.includes(mid)) rels.moods.push(mid);
  }

  return rels;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🎵 Batch Import: RapMonitor → Track Entities`);
  console.log(`   DRY_RUN=${DRY_RUN}  MAX_TRACKS=${MAX_TRACKS === Infinity ? "ALL" : MAX_TRACKS}\n`);

  if (!fs.existsSync(INPUT)) {
    console.error("❌ Input file not found:", INPUT);
    process.exit(1);
  }

  const songs: RapMonitorSong[] = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const complete = songs.filter((s) => s.analysis_status === "complete");
  console.log(`📊 Total songs: ${songs.length}`);
  console.log(`✅ Complete: ${complete.length}`);

  // Load existing track slugs
  const existingTracks = fs.existsSync(CONTENT_DIR)
    ? fs.readdirSync(CONTENT_DIR).filter((d) => d.startsWith("track_"))
    : [];
  const processedSlugs = new Set<string>();
  console.log(`📁 Existing tracks: ${existingTracks.length}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;
  const missingLog: string[] = [];
  const artistTrackCount: Record<string, number> = {};

  for (const song of complete) {
    if (created >= MAX_TRACKS) break;

    const artistSlug = normalizeSlug(song.artist_name || "unknown");
    const trackSlug = normalizeSlug(song.title || "untitled");
    const entityId = `track_${artistSlug}-${trackSlug}`;
    const entityDir = path.join(CONTENT_DIR, entityId);

    // Skip if already exists (including within this run's processed set)
    if (existingTracks.includes(entityId) || processedSlugs.has(entityId)) {
      skipped++;
      continue;
    }
    processedSlugs.add(entityId);

    // Check artist exists
    const artistId = findExistingArtist(song.artist_name);
    if (!artistId) {
      missingLog.push(`MISSING ARTIST: ${song.artist_name} for ${song.title}`);
      continue; // Skip — can't create track without artist
    }

    // Check slug collision within this run (deduplicate)
    if (existingTracks.includes(entityId)) {
      skipped++;
      continue;
    }

    // Count tracks per artist
    artistTrackCount[song.artist_name] = (artistTrackCount[song.artist_name] || 0) + 1;

    // Build files
    const meta = {
      id: entityId,
      type: "track",
      slug: `${artistSlug}-${trackSlug}`,
      title: song.title,
      description: song.ai_summary_short || `Skladba ${song.title} od ${song.artist_name}.`,
      publishedAt: song.release_date || `${song.year || 2024}-01-01`,
      extraMeta: {
        duration: parseDurationToSec(song.duration) || null,
        explicit: true,
        sources: [
          ...(song.spotify_url ? [song.spotify_url] : []),
          ...(song.youtube_url ? [song.youtube_url] : []),
        ].filter(Boolean),
      },
    };

    const mdx = buildEntityMdx(song);
    const rels = buildRelations(song);

    // Write
    if (!DRY_RUN) {
      try {
        fs.mkdirSync(entityDir, { recursive: true });
        fs.writeFileSync(path.join(entityDir, "meta.json"), JSON.stringify(meta, null, 2));
        fs.writeFileSync(path.join(entityDir, "entity.mdx"), mdx || "## O čem je\n\n*(Analýza připravována)*\n");
        fs.writeFileSync(path.join(entityDir, "relations.json"), JSON.stringify(rels, null, 2));
        created++;
      } catch (err) {
        console.error(`❌ Error writing ${entityId}:`, err);
        errors++;
      }
    } else {
      // Dry run: just log
      console.log(`[DRY] Would create: ${entityId}`);
      console.log(`  Artist: ${song.artist_name} → ${artistId}`);
      console.log(`  Album: ${song.album || "(none)"} → ${rels.belongsToAlbum.join(", ") || "(none)"}`);
      console.log(`  Genres: ${rels.genres.join(", ")}`);
      console.log(`  Moods: ${rels.moods.join(", ")}`);
      console.log(`  Producers: ${rels.producers.join(", ") || "(none)"}`);
      console.log(`  Feat: ${rels.featuring.join(", ") || "(none)"}`);
      created++;
    }
  }

  console.log(`\n✅ Done.`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped (existing): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Missing artists: ${missingLog.length}`);

  if (missingLog.length > 0) {
    console.log(`\n⚠️ Missing artists (skipped):`);
    missingLog.forEach((m) => console.log("   " + m));
  }

  // Show artist distribution
  console.log(`\n📊 Tracks per artist:`);
  Object.entries(artistTrackCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([artist, count]) => console.log(`   ${artist}: ${count}`));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
