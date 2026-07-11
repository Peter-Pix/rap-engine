#!/usr/bin/env -S npx tsx
/**
 * YouTube Embed Finder via SerpAPI for 4rap.cz
 *
 * Uses SerpAPI youtube search engine (250 searches/month free tier).
 *
 * Usage:
 *   SERPAPI_KEY=*** npx tsx scripts/youtube-embed-finder.ts "Ektor" "Originál"
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export type YoutubeEmbed = {
  id: string;
  title: string;
  channel: string;
  views: number;
  uploadDate: string;
  isOfficial: boolean;
  isLyricVideo: boolean;
  isLive: boolean;
};

type YoutubeCache = Record<string, YoutubeEmbed | null>;

const CACHE_FILE = join(__dirname, ".tmp", "youtube-serpapi-cache.json");
const API_KEY = process.env.SERPAPI_KEY;

if (!API_KEY) {
  console.error("Missing SERPAPI_KEY environment variable");
}

const OFFICIAL_KEYWORDS = [
  "vevo", "official", "topic", "milion+", "bigboss", "universal",
  "sony", "warner", "supraphon", "rychli kluci", "blakkwood",
  "loud", "mgm", "jiggy", "44 enterprise", "nevermore", "blackrose",
];

function isOfficialChannel(channel: string): boolean {
  const lower = channel.toLowerCase();
  return OFFICIAL_KEYWORDS.some((k) => lower.includes(k));
}

// ─── Cache ───────────────────────────────────────────────────────────────

function loadCache(): YoutubeCache {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as YoutubeCache;
  } catch {
    return {};
  }
}

function saveCache(cache: YoutubeCache) {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ─── SerpAPI helpers ─────────────────────────────────────────────────────

interface SerpApiVideoResult {
  video_id?: string;
  link?: string;
  title?: string;
  channel?: { name?: string };
  views?: string;
  extracted_views?: number;
  published_date?: string;
  length?: string;
  thumbnail?: { static?: string };
}

interface SerpApiResponse {
  video_results?: SerpApiVideoResult[];
  search_metadata?: { status?: string };
  error?: string;
}

async function serpApiSearch(query: string): Promise<SerpApiVideoResult[]> {
  if (!API_KEY) return [];
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "youtube");
  url.searchParams.set("search_query", query);
  url.searchParams.set("api_key", API_KEY);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`SerpAPI error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = (await res.json()) as SerpApiResponse;
    return data.video_results ?? [];
  } catch (err) {
    console.error("SerpAPI request failed:", err);
    return [];
  }
}

interface SerpApiVideoDetails {
  title?: string;
  channel?: { name?: string };
  extracted_views?: number;
  published_date?: string;
}

async function serpApiVideoDetails(videoId: string): Promise<SerpApiVideoDetails | null> {
  if (!API_KEY) return null;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "youtube_video");
  url.searchParams.set("v", videoId);
  url.searchParams.set("api_key", API_KEY);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as SerpApiVideoDetails;
  } catch {
    return null;
  }
}

// ─── Relevance check ─────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRelevant(title: string, artist: string, track: string): boolean {
  const t = title.toLowerCase();
  return t.includes(normalize(artist)) || t.includes(artist.toLowerCase()) ||
    t.includes(normalize(track)) || t.includes(track.toLowerCase());
}

// ─── Public API ──────────────────────────────────────────────────────────

export async function findYoutubeEmbed(
  artist: string,
  track: string,
): Promise<YoutubeEmbed | null> {
  if (!API_KEY) {
    console.error("No SERPAPI_KEY set");
    return null;
  }

  const cache = loadCache();
  const cacheKey = `${artist.toLowerCase()} - ${track.toLowerCase()}`;
  if (cacheKey in cache) return cache[cacheKey];

  const queries = [
    `${artist} ${track} (Official Audio)`,
    `${artist} ${track} (Official Video)`,
    `${artist} ${track} (Lyric Video)`,
    `${artist} ${track}`,
  ];

  let best: YoutubeEmbed | null = null;

  for (const query of queries) {
    const results = await serpApiSearch(query);
    if (results.length === 0) continue;

    // Find first relevant result
    for (const r of results) {
      const videoId = r.video_id;
      if (!videoId) continue;
      const title = r.title ?? "";
      if (!isRelevant(title, artist, track)) continue;

      const channel = r.channel?.name ?? "";
      const views = r.extracted_views ?? 0;
      const uploadDate = r.published_date ?? "";
      const isLyricVideo = title.toLowerCase().includes("lyric") || title.toLowerCase().includes("text písně");
      const isLive = title.toLowerCase().includes("live");

      const embed: YoutubeEmbed = {
        id: videoId,
        title,
        channel,
        views,
        uploadDate,
        isOfficial: isOfficialChannel(channel),
        isLyricVideo,
        isLive,
      };

      // Prefer official videos
      if (!best || (embed.isOfficial && !best.isOfficial)) {
        best = embed;
      }
      if (best.isOfficial) break;
    }
    if (best) break;
  }

  cache[cacheKey] = best;
  saveCache(cache);
  return best;
}

export async function enrichYoutubeDetails(
  videoId: string,
): Promise<Partial<YoutubeEmbed> | null> {
  const details = await serpApiVideoDetails(videoId);
  if (!details) return null;

  return {
    title: details.title,
    channel: details.channel?.name ?? "",
    views: details.extracted_views ?? 0,
    uploadDate: details.published_date ?? "",
    isOfficial: details.channel?.name
      ? isOfficialChannel(details.channel.name)
      : false,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: SERPAPI_KEY=*** npx tsx scripts/youtube-embed-finder.ts \"<artist>\" \"<track>\"");
    process.exit(0);
  }
  const [artist, track] = args;
  findYoutubeEmbed(artist, track).then((embed) => {
    console.log(embed ? JSON.stringify(embed, null, 2) : "No relevant video found.");
  });
}