#!/usr/bin/env -S npx tsx
/**
 * Batch job: enrich track entities with structured YouTube embed metadata.
 *
 * Usage:
 *   YOUTUBE_API_KEY=<key> npx tsx scripts/batch-add-youtube-embeds.ts [--dry-run] [--limit=50]
 *
 * Workflow:
 *   1. Load all track entities from content/entities/track_*.
 *   2. Sort by graph degree (popularity) descending.
 *   3. For each track, resolve the primary artist name and track title.
 *   4. Call findYoutubeEmbed() to find an official/verified video.
 *   5. Write youtube metadata to the top level of meta.json.
 *   6. In dry-run mode, only print a report without writing files.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { findYoutubeEmbed } from "./youtube-embed-finder";
import { loadEntity } from "../src/lib/content/loader";
import { listEntityIds } from "../src/lib/content/paths";
import type { TrackMeta } from "../src/lib/content/schemas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, ".content-cache");

interface Candidate {
  entityId: string;
  title: string;
  artistName: string;
  artistId: string;
  degree: number;
  duration?: string;
  hasYoutube: boolean;
}

function readJson<T = unknown>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function loadGraph(): Array<{ from: string; relation: string; to: string }> {
  const file = path.join(CACHE_DIR, "graph.json");
  return readJson(file) ?? [];
}

function computeDegrees(
  graph: Array<{ from: string; relation: string; to: string }>,
): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const edge of graph) {
    degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
    degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
  }
  return degrees;
}

function formatDuration(seconds?: number): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseArgs(): { dryRun: boolean; limit: number } {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.replace("--limit=", "")) || 50 : 50;
  return { dryRun, limit };
}

async function main() {
  if (!process.env.YOUTUBE_API_KEY) {
    console.error("Missing YOUTUBE_API_KEY environment variable.");
    console.error("Get a key at https://console.cloud.google.com/apis/credentials");
    process.exit(1);
  }

  const { dryRun, limit } = parseArgs();
  console.log(`Running in ${dryRun ? "DRY-RUN" : "WRITE"} mode, limit=${limit}`);

  const graph = loadGraph();
  const degrees = computeDegrees(graph);

  // Load all track entities
  const allIds = listEntityIds();
  const trackIds = allIds.filter((id) => id.startsWith("track_"));

  const candidates: Candidate[] = [];
  for (const id of trackIds) {
    const entity = loadEntity(id);
    if (!entity) continue;
    const meta = entity.meta as TrackMeta;
    const rels = entity.relations;

    // Skip if already has structured youtube metadata (unless you want to refresh)
    if (meta.youtube) {
      candidates.push({
        entityId: id,
        title: meta.title,
        artistName: "",
        artistId: "",
        degree: degrees.get(id) ?? 0,
        duration: formatDuration((meta.extraMeta as any)?.duration as number | undefined),
        hasYoutube: true,
      });
      continue;
    }

    const artistIds = rels.primaryArtist ?? rels.artists ?? [];
    if (artistIds.length === 0) continue;

    const artistId = artistIds[0];
    const artist = loadEntity(artistId);
    if (!artist) continue;

    candidates.push({
      entityId: id,
      title: meta.title,
      artistName: artist.meta.title,
      artistId,
      degree: degrees.get(id) ?? 0,
      duration: formatDuration((meta.extraMeta as any)?.duration as number | undefined),
      hasYoutube: false,
    });
  }

  // Sort by degree descending, then alphabetically
  candidates.sort((a, b) => {
    if (b.degree !== a.degree) return b.degree - a.degree;
    return a.title.localeCompare(b.title);
  });

  const targets = candidates.filter((c) => !c.hasYoutube).slice(0, limit);

  console.log(`\nFound ${trackIds.length} tracks, ${targets.length} candidates to process.\n`);

  const results: {
    id: string;
    title: string;
    artist: string;
    status: "found" | "not_found" | "skipped" | "error";
    videoTitle?: string;
    channel?: string;
    views?: number;
    isOfficial?: boolean;
    error?: string;
  }[] = [];

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    console.log(`[${i + 1}/${targets.length}] ${c.entityId} — ${c.artistName} - ${c.title}`);

    try {
      const embed = await findYoutubeEmbed(c.artistName, c.title, c.duration);

      if (!embed) {
        results.push({
          id: c.entityId,
          title: c.title,
          artist: c.artistName,
          status: "not_found",
        });
        console.log(`  → No relevant video found`);
        continue;
      }

      results.push({
        id: c.entityId,
        title: c.title,
        artist: c.artistName,
        status: "found",
        videoTitle: embed.title,
        channel: embed.channel,
        views: embed.views,
        isOfficial: embed.isOfficial,
      });
      console.log(`  → Found: ${embed.title} (${embed.channel}, ${embed.views.toLocaleString()} views)`);

      if (!dryRun) {
        const entity = loadEntity(c.entityId);
        if (!entity) continue;
        const metaPath = path.join(ROOT, "content", "entities", c.entityId, "meta.json");
        const meta = entity.meta as TrackMeta;
        meta.youtube = embed;
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
      }
    } catch (err) {
      results.push({
        id: c.entityId,
        title: c.title,
        artist: c.artistName,
        status: "error",
        error: String(err),
      });
      console.error(`  → Error: ${err}`);
    }
  }

  // Report
  const found = results.filter((r) => r.status === "found").length;
  const notFound = results.filter((r) => r.status === "not_found").length;
  const errors = results.filter((r) => r.status === "error").length;

  console.log("\n═══ SUMMARY ═══");
  console.log(`Processed:     ${results.length}`);
  console.log(`Found videos:  ${found}`);
  console.log(`Not found:     ${notFound}`);
  console.log(`Errors:        ${errors}`);

  const reportPath = path.join(ROOT, ".tmp", `youtube-batch-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error("Batch job failed:", err);
  process.exit(1);
});
