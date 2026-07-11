#!/usr/bin/env -S npx tsx
/**
 * Extract YouTube video IDs from existing extraMeta.sources in track meta.json files.
 *
 * Zero-cost: no API needed. Just parses existing URLs.
 * Writes structured `youtube` object to top-level of meta.json.
 *
 * Usage:
 *   npx tsx scripts/extract-existing-youtube.ts [--dry-run]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadEntity } from "../src/lib/content/loader";
import { listEntityIds } from "../src/lib/content/paths";
import type { TrackMeta } from "../src/lib/content/schemas";

const ROOT = path.resolve(__dirname, "..");

function extractYoutubeId(url: string): string | null {
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function parseArgs(): { dryRun: boolean } {
  return { dryRun: process.argv.slice(2).includes("--dry-run") };
}

function main() {
  const { dryRun } = parseArgs();
  console.log(`Mode: ${dryRun ? "DRY-RUN" : "WRITE"}`);

  const allIds = listEntityIds();
  const trackIds = allIds.filter((id) => id.startsWith("track_"));

  let extracted = 0;
  let skipped = 0;
  let alreadyHad = 0;
  let noYoutube = 0;

  const report: Array<{
    id: string;
    title: string;
    youtubeId: string | null;
    status: "extracted" | "skipped" | "already_had" | "no_url";
  }> = [];

  for (const id of trackIds) {
    const entity = loadEntity(id);
    if (!entity) continue;
    const meta = entity.meta as TrackMeta;

    // Skip if already has structured youtube metadata
    if (meta.youtube) {
      alreadyHad++;
      report.push({ id, title: meta.title, youtubeId: meta.youtube.id, status: "already_had" });
      continue;
    }

    // Look for YouTube URL in extraMeta.sources
    const extraMeta = (meta as any).extraMeta as { sources?: string[] } | undefined;
    const sources = extraMeta?.sources ?? [];
    const youtubeUrl = sources.find(
      (s) => s.includes("youtube.com") || s.includes("youtu.be"),
    );

    if (!youtubeUrl) {
      noYoutube++;
      report.push({ id, title: meta.title, youtubeId: null, status: "no_url" });
      continue;
    }

    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      skipped++;
      report.push({ id, title: meta.title, youtubeId: null, status: "skipped" });
      continue;
    }

    // Build structured youtube object (minimal — no views/channel from URL alone)
    const youtubeObj = {
      id: youtubeId,
      title: meta.title, // track title as fallback
      channel: "", // unknown without API
      views: 0, // unknown without API
      uploadDate: meta.publishedAt ?? "", // track release date as fallback
      isOfficial: false, // unknown without API, conservative default
      isLyricVideo: false,
      isLive: false,
    };

    report.push({ id, title: meta.title, youtubeId, status: "extracted" });
    extracted++;

    if (!dryRun) {
      const metaPath = path.join(ROOT, "content", "entities", id, "meta.json");
      const updated = { ...meta, youtube: youtubeObj };
      fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2) + "\n");
    }
  }

  console.log("\n═══ SUMMARY ═══");
  console.log(`Total tracks:      ${trackIds.length}`);
  console.log(`Extracted:         ${extracted}`);
  console.log(`Already had youtube: ${alreadyHad}`);
  console.log(`No YouTube URL:    ${noYoutube}`);
  console.log(`Skipped (bad URL): ${skipped}`);

  // List tracks without YouTube URL (candidates for SerpAPI)
  const noUrlTracks = report.filter((r) => r.status === "no_url");
  if (noUrlTracks.length > 0) {
    console.log(`\n═══ TRACKS WITHOUT YOUTUBE URL (${noUrlTracks.length}) ═══`);
    for (const t of noUrlTracks) {
      console.log(`  ${t.id} — ${t.title}`);
    }
  }

  // Save report
  const reportPath = path.join(ROOT, ".tmp", `youtube-extract-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${reportPath}`);
}

main();