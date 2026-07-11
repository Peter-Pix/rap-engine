#!/usr/bin/env -S npx tsx
/**
 * Batch: SerpAPI YouTube enrichment for 4rap.cz tracks.
 *
 * Phase 1: Search for tracks without any YouTube URL (29 tracks → 29 credits).
 * Phase 2: Enrich top 50 tracks (by graph degree) with video details (50 credits).
 *
 * Total: ~79 SerpAPI credits (out of 250/month free tier).
 *
 * Usage:
 *   SERPAPI_KEY=*** npx tsx scripts/batch-youtube-serpapi.ts [--dry-run] [--phase=1|2|all]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadEntity } from "../src/lib/content/loader";
import { listEntityIds } from "../src/lib/content/paths";
import type { TrackMeta } from "../src/lib/content/schemas";
import { findYoutubeEmbed, enrichYoutubeDetails } from "./youtube-embed-finder";

const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, ".content-cache");

function readJson<T = unknown>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

function computeDegrees(): Map<string, number> {
  const graph = readJson<Array<{ from: string; to: string }>>(
    path.join(CACHE_DIR, "graph.json"),
  ) ?? [];
  const degrees = new Map<string, number>();
  for (const e of graph) {
    degrees.set(e.from, (degrees.get(e.from) ?? 0) + 1);
    degrees.set(e.to, (degrees.get(e.to) ?? 0) + 1);
  }
  return degrees;
}

function parseArgs(): { dryRun: boolean; phase: "1" | "2" | "all" } {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const phaseArg = args.find((a) => a.startsWith("--phase="));
  const phase = phaseArg ? (phaseArg.replace("--phase=", "") as "1" | "2" | "all") : "all";
  return { dryRun, phase };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!process.env.SERPAPI_KEY) {
    console.error("Missing SERPAPI_KEY. Set it with: export SERPAPI_KEY=***");
    process.exit(1);
  }

  const { dryRun, phase } = parseArgs();
  console.log(`Mode: ${dryRun ? "DRY-RUN" : "WRITE"}, Phase: ${phase}`);

  const degrees = computeDegrees();
  const allIds = listEntityIds();
  const trackIds = allIds.filter((id) => id.startsWith("track_"));

  const report: Array<{
    id: string;
    title: string;
    artist: string;
    status: "found" | "not_found" | "enriched" | "skipped" | "error";
    videoId?: string;
    channel?: string;
    views?: number;
    isOfficial?: boolean;
    error?: string;
  }> = [];

  // ── Phase 1: Search for tracks without YouTube URL ────────────────────
  if (phase === "1" || phase === "all") {
    console.log("\n═══ PHASE 1: Search for tracks without YouTube URL ═══");

    const withoutYoutube: Array<{ id: string; title: string; artistId: string; artistName: string; degree: number }> = [];

    for (const id of trackIds) {
      const entity = loadEntity(id);
      if (!entity) continue;
      const meta = entity.meta as TrackMeta;
      if (meta.youtube) continue; // Skip tracks that already have youtube

      const artistIds = entity.relations.primaryArtist ?? entity.relations.artists ?? [];
      if (artistIds.length === 0) continue;
      const artist = loadEntity(artistIds[0]);
      if (!artist) continue;

      withoutYoutube.push({
        id,
        title: meta.title,
        artistId: artistIds[0],
        artistName: artist.meta.title,
        degree: degrees.get(id) ?? 0,
      });
    }

    // Sort by degree descending
    withoutYoutube.sort((a, b) => b.degree - a.degree);
    console.log(`Found ${withoutYoutube.length} tracks without YouTube URL.\n`);

    for (let i = 0; i < withoutYoutube.length; i++) {
      const t = withoutYoutube[i];
      console.log(`[${i + 1}/${withoutYoutube.length}] ${t.artistName} - ${t.title}`);

      try {
        const embed = await findYoutubeEmbed(t.artistName, t.title);

        if (!embed) {
          report.push({ id: t.id, title: t.title, artist: t.artistName, status: "not_found" });
          console.log("  → Not found");
          continue;
        }

        report.push({
          id: t.id,
          title: t.title,
          artist: t.artistName,
          status: "found",
          videoId: embed.id,
          channel: embed.channel,
          views: embed.views,
          isOfficial: embed.isOfficial,
        });
        console.log(`  → Found: ${embed.title} (${embed.channel}, ${embed.views.toLocaleString()} views)`);

        if (!dryRun) {
          const entity = loadEntity(t.id);
          if (!entity) continue;
          const meta = entity.meta as TrackMeta;
          const metaPath = path.join(ROOT, "content", "entities", t.id, "meta.json");
          const updated = { ...meta, youtube: embed };
          fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2) + "\n");
        }

        await sleep(1000); // Rate limit: 1 req/sec
      } catch (err) {
        report.push({ id: t.id, title: t.title, artist: t.artistName, status: "error", error: String(err) });
        console.error(`  → Error: ${err}`);
      }
    }
  }

  // ── Phase 2: Enrich top 50 tracks with video details ──────────────────
  if (phase === "2" || phase === "all") {
    console.log("\n═══ PHASE 2: Enrich top 50 tracks with video details ═══");

    const withYoutube: Array<{ id: string; title: string; videoId: string; degree: number; hasChannel: boolean }> = [];

    for (const id of trackIds) {
      const entity = loadEntity(id);
      if (!entity) continue;
      const meta = entity.meta as TrackMeta;
      if (!meta.youtube) continue;

      withYoutube.push({
        id,
        title: meta.title,
        videoId: meta.youtube.id,
        degree: degrees.get(id) ?? 0,
        hasChannel: !!meta.youtube.channel,
      });
    }

    // Sort: first those without channel (need enrichment most), then by degree
    withYoutube.sort((a, b) => {
      if (a.hasChannel !== b.hasChannel) return a.hasChannel ? 1 : -1;
      return b.degree - a.degree;
    });

    const targets = withYoutube.slice(0, 50);
    console.log(`Enriching top ${targets.length} tracks (those without channel first).\n`);

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      console.log(`[${i + 1}/${targets.length}] ${t.id} — ${t.title} (video: ${t.videoId})`);

      try {
        const details = await enrichYoutubeDetails(t.videoId);

        if (!details) {
          report.push({ id: t.id, title: t.title, artist: "", status: "not_found", videoId: t.videoId });
          console.log("  → No details found");
          continue;
        }

        report.push({
          id: t.id,
          title: t.title,
          artist: "",
          status: "enriched",
          videoId: t.videoId,
          channel: details.channel,
          views: details.views,
          isOfficial: details.isOfficial,
        });
        console.log(`  → ${details.channel} — ${details.title} (${details.views?.toLocaleString() ?? 0} views)`);

        if (!dryRun) {
          const entity = loadEntity(t.id);
          if (!entity) continue;
          const meta = entity.meta as TrackMeta;
          if (!meta.youtube) continue;
          const updatedYoutube = {
            ...meta.youtube,
            title: details.title ?? meta.youtube.title,
            channel: details.channel ?? meta.youtube.channel,
            views: details.views ?? meta.youtube.views,
            uploadDate: details.uploadDate ?? meta.youtube.uploadDate,
            isOfficial: details.isOfficial ?? meta.youtube.isOfficial,
          };
          const metaPath = path.join(ROOT, "content", "entities", t.id, "meta.json");
          const updated = { ...meta, youtube: updatedYoutube };
          fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2) + "\n");
        }

        await sleep(1000); // Rate limit: 1 req/sec
      } catch (err) {
        report.push({ id: t.id, title: t.title, artist: "", status: "error", error: String(err) });
        console.error(`  → Error: ${err}`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const found = report.filter((r) => r.status === "found").length;
  const enriched = report.filter((r) => r.status === "enriched").length;
  const notFound = report.filter((r) => r.status === "not_found").length;
  const errors = report.filter((r) => r.status === "error").length;

  console.log("\n═══ SUMMARY ═══");
  console.log(`Found (phase 1):   ${found}`);
  console.log(`Enriched (phase 2): ${enriched}`);
  console.log(`Not found:         ${notFound}`);
  console.log(`Errors:            ${errors}`);
  console.log(`SerpAPI credits used: ${found + enriched}`);

  const reportPath = path.join(ROOT, ".tmp", `youtube-serpapi-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${reportPath}`);
}

main().catch((err) => {
  console.error("Batch job failed:", err);
  process.exit(1);
});