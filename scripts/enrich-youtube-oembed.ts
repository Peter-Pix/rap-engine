#!/usr/bin/env -S npx tsx
/**
 * Enrich track youtube metadata using free YouTube oEmbed API.
 *
 * For tracks that already have a youtube.id (from extract-existing-youtube.ts),
 * this script fetches the real video title and channel name via oEmbed (no API key needed).
 * Also detects isOfficial from channel name.
 *
 * Usage:
 *   npx tsx scripts/enrich-youtube-oembed.ts [--dry-run] [--delay=500]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadEntity } from "../src/lib/content/loader";
import { listEntityIds } from "../src/lib/content/paths";
import type { TrackMeta } from "../src/lib/content/schemas";

const ROOT = path.resolve(__dirname, "..");

interface OEmbedResponse {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
  type: string;
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOEmbed(videoId: string): Promise<OEmbedResponse | null> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as OEmbedResponse;
  } catch {
    return null;
  }
}

function parseArgs(): { dryRun: boolean; delay: number } {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const delayArg = args.find((a) => a.startsWith("--delay="));
  const delay = delayArg ? Number(delayArg.replace("--delay=", "")) || 500 : 500;
  return { dryRun, delay };
}

async function main() {
  const { dryRun, delay } = parseArgs();
  console.log(`Mode: ${dryRun ? "DRY-RUN" : "WRITE"}, delay: ${delay}ms`);

  const allIds = listEntityIds();
  const trackIds = allIds.filter((id) => id.startsWith("track_"));

  let enriched = 0;
  let notFound = 0;
  let skipped = 0;
  let noYoutube = 0;

  const report: Array<{
    id: string;
    title: string;
    videoId: string;
    status: "enriched" | "not_found" | "skipped" | "no_youtube";
    channel?: string;
    videoTitle?: string;
  }> = [];

  for (let i = 0; i < trackIds.length; i++) {
    const id = trackIds[i];
    const entity = loadEntity(id);
    if (!entity) continue;
    const meta = entity.meta as TrackMeta;

    if (!meta.youtube) {
      noYoutube++;
      report.push({ id, title: meta.title, videoId: "", status: "no_youtube" });
      continue;
    }

    // Skip if already enriched (has channel name)
    if (meta.youtube.channel) {
      skipped++;
      report.push({
        id,
        title: meta.title,
        videoId: meta.youtube.id,
        status: "skipped",
        channel: meta.youtube.channel,
      });
      continue;
    }

    const videoId = meta.youtube.id;
    process.stdout.write(`[${i + 1}/${trackIds.length}] ${id} — `);

    const oembed = await fetchOEmbed(videoId);

    if (!oembed) {
      notFound++;
      report.push({ id, title: meta.title, videoId, status: "not_found" });
      console.log("oEmbed not found");
      await sleep(delay);
      continue;
    }

    const updatedYoutube = {
      ...meta.youtube,
      title: oembed.title,
      channel: oembed.author_name,
      isOfficial: isOfficialChannel(oembed.author_name),
      isLyricVideo: oembed.title.toLowerCase().includes("lyric") ||
        oembed.title.toLowerCase().includes("text písně"),
      isLive: oembed.title.toLowerCase().includes("live"),
    };

    enriched++;
    report.push({
      id,
      title: meta.title,
      videoId,
      status: "enriched",
      channel: oembed.author_name,
      videoTitle: oembed.title,
    });
    console.log(`${oembed.author_name} — ${oembed.title}`);

    if (!dryRun) {
      const metaPath = path.join(ROOT, "content", "entities", id, "meta.json");
      const updated = { ...meta, youtube: updatedYoutube };
      fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2) + "\n");
    }

    await sleep(delay);
  }

  console.log("\n═══ SUMMARY ═══");
  console.log(`Total tracks:    ${trackIds.length}`);
  console.log(`Enriched:        ${enriched}`);
  console.log(`Skipped (already): ${skipped}`);
  console.log(`oEmbed not found: ${notFound}`);
  console.log(`No youtube:      ${noYoutube}`);

  const reportPath = path.join(ROOT, ".tmp", `youtube-oembed-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${reportPath}`);
}

main().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});