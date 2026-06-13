#!/usr/bin/env node
/**
 * sync-images-from-base44.ts — Stáhne profilové fotky rapperů z Base44 API
 *
 * Usage: npx tsx scripts/sync-images-from-base44.ts
 * 
 * Projde všechny rappery v Base44, stáhne chybějící fotky do public/images/artists/
 * a aktualizuje images.ts.
 *
 * Bezpečnost:
 * - Nepřepisuje existující fotky (přeskočí)
 * - Git commit každé dávky
 * - Loguje do logs/sync-images.log
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const REPO = path.resolve(__dirname, "..");
const LOG_FILE = path.join(REPO, "logs", "sync-images.log");
const IMAGE_DIR = path.join(REPO, "public", "images", "artists");
const IMAGES_TS = path.join(REPO, "src", "lib", "content", "images.ts");

const BASE44_URL = "https://44rap.base44.app";
const BASE44_KEY = "b9d03638f3df4fe49ee5e75ab26d0803";
const BASE44_APP_ID = "6a2d67aec1b6765f87586014";

// ─── Logger ───────────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function bail(msg: string) {
  log(`⚠️ BAIL: ${msg}`);
  process.exit(0);
}

function git(...args: string[]): string {
  try {
    return execSync(`git ${args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(" ")}`, {
      cwd: REPO, encoding: "utf-8",
    }).trim();
  } catch { return ""; }
}

function gitCommit(msg: string) {
  const status = git("status", "--porcelain");
  if (!status) return false;
  const files = status.split("\n").filter(Boolean).map(l => l.slice(3));
  git("add", ...files);
  git("commit", "-m", msg);
  log(`  → committed: ${msg}`);
  return true;
}

// ─── Base44 API ───────────────────────────────────────────────────────────

interface Base44Rapper {
  id: string;
  slug?: string;
  title?: string;
  artist_name?: string;
  profile_image_url?: string;
  photo_filename?: string;
  status?: string;
}

async function fetchAllRappers(): Promise<Base44Rapper[]> {
  const url = `${BASE44_URL}/api/entities/Rapper`;
  const res = await fetch(url, {
    headers: { api_key: BASE44_KEY, "x-app-id": BASE44_APP_ID },
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("App not found")) bail("Base44 app not found");
    log(`Base44 API returned ${res.status}: ${text.slice(0, 200)}`);
    return [];
  }
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.entities || data.data || [];
  return items;
}

// ─── Download image ────────────────────────────────────────────────────────

async function downloadImage(url: string, dest: string): Promise<boolean> {
  if (fs.existsSync(dest)) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return false;
    fs.writeFileSync(dest, buffer);
    return true;
  } catch {
    return false;
  }
}

// ─── Update images.ts ──────────────────────────────────────────────────────

function addToImagesTs(slug: string, ext: string) {
  const content = fs.readFileSync(IMAGES_TS, "utf-8");
  const path = `/images/artists/${slug}${ext}`;
  const entry = `  '${slug}': '${path}',`;

  if (content.includes(`'${slug}'`)) return; // already exists

  // Find the ARTIST_IMAGES constant
  const lines = content.split("\n");
  const blockStart = lines.findIndex(l => l.includes("ARTIST_IMAGES"));
  if (blockStart === -1) {
    log(`  ⚠️  Could not find ARTIST_IMAGES in images.ts`);
    return;
  }

  // Find closing }
  for (let i = blockStart; i < lines.length; i++) {
    if (lines[i].trim() === "};") {
      lines.splice(i, 0, entry);
      break;
    }
  }

  fs.writeFileSync(IMAGES_TS, lines.join("\n"));
  log(`  → added to images.ts: ${slug}${ext}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════ SYNC IMAGES FROM BASE44 ═══════════");
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  const existing = new Set(
    fs.existsSync(IMAGE_DIR)
      ? fs.readdirSync(IMAGE_DIR).map(f => path.parse(f).name)
      : []
  );
  log(`Already have: ${existing.size} images`);

  // Fetch all rappers from Base44
  const rappers = await fetchAllRappers();
  if (rappers.length === 0) bail("No rappers returned from Base44");
  log(`Found ${rappers.length} rappers in Base44`);

  let downloaded = 0;
  let withImage = 0;

  for (const rapper of rappers) {
    const slug = rapper.artist_name
      ? rapper.artist_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      : rapper.slug || rapper.id?.replace(/^.*_/, "");

    if (!slug || !rapper.profile_image_url) continue;
    withImage++;

    if (existing.has(slug)) continue;

    // Determine extension from URL or use .webp
    const url = rapper.profile_image_url;
    const urlPath = new URL(url).pathname;
    let ext = path.extname(urlPath);
    if (!ext || ext === ".svg") ext = ".webp"; // skip SVG placeholders
    if (ext === ".svg") continue;

    const dest = path.join(IMAGE_DIR, `${slug}${ext}`);
    const ok = await downloadImage(url, dest);

    if (ok) {
      const size = fs.statSync(dest).size;
      log(`  ✓ ${slug}${ext} (${(size / 1024).toFixed(0)}KB)`);
      addToImagesTs(slug, ext);
      downloaded++;
    } else {
      log(`  ✗ ${slug} — download failed`);
    }
  }

  log(`\nStatistics:`);
  log(`  - Rappers in Base44: ${rappers.length}`);
  log(`  - With profile_image_url: ${withImage}`);
  log(`  - Downloaded now: ${downloaded}`);
  log(`  - Total in images/: ${existing.size + downloaded}`);

  if (downloaded > 0) {
    gitCommit(`feat: sync artist images from Base44 (${downloaded} new)`);
  }

  log("═══════════ END ═══════════\n");
}

main().catch((e) => {
  log(`\n❌ FATAL: ${e.message || e}`);
  process.exit(1);
});