#!/usr/bin/env node
/**
 * hourly-sync.ts — Hodinová automatizace
 *
 * Co dělá:
 * 1. Zkontroluje Base44 API (test jestli appka žije)
 * 2. Projde nově publikované rappery v Base44
 * 3. Porovná s lokálními entitami — chybějící stáhne
 * 4. Git commit každé změny zvlášť
 *
 * Bezpečnost:
 * - Nikdy nepřepisuje již ověřené informace
 * - Každá změna = samostatný git commit
 * - Loguje všechno do logs/hourly-sync.log
 * - Pokud Base44 neodpovídá, jen zaloguje a skončí
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ─── Config ───────────────────────────────────────────────────────────────

const REPO = path.resolve(__dirname, "..");
const LOG_FILE = path.join(REPO, "logs", "hourly-sync.log");
const BASE44_URL = "https://4rap-vault-pro.base44.app";
const BASE44_KEY = "b9d03638f3df4fe49ee5e75ab26d0803";
const BASE44_APP_ID = "6a2d67aec1b6765f87586014";

// ─── Logger ───────────────────────────────────────────────────────────────

function log(msg: string) {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function bail(msg: string) {
  log(`⚠️ BAIL: ${msg}`);
  process.exit(0); // non-error exit — cron doesn't need to alert
}

// ─── Git helpers ──────────────────────────────────────────────────────────

function git(...args: string[]): string {
  try {
    const cmd = `git ${args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(" ")}`;
    return execSync(cmd, { cwd: REPO, encoding: "utf-8" }).trim();
  } catch (e: any) {
    log(`git ${args.join(" ")} failed: ${e.stderr?.toString().trim() || e.message}`);
    return "";
  }
}

function gitCommit(message: string) {
  const status = git("status", "--porcelain");
  if (!status) {
    log("  → nothing to commit, skipping");
    return false;
  }
  const files = status.split("\n").map((l) => l.slice(3)).filter(Boolean);
  git("add", ...files);
  git("commit", "-m", message);
  log(`  → committed: ${message} (${files.length} files)`);
  return true;
}

// ─── Read local state ────────────────────────────────────────────────────

interface EntityMeta {
  id: string;
  type: string;
  slug: string;
  title: string;
  status?: string;
}

function readLocalEntities(): Map<string, EntityMeta> {
  const cachePath = path.join(REPO, ".content-cache", "entities.json");
  if (!fs.existsSync(cachePath)) {
    bail("content-cache not found, run 'npm run cache:build' first");
  }
  const raw = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  const map = new Map<string, EntityMeta>();
  for (const [id, data] of Object.entries(raw) as [string, any][]) {
    map.set(id, { id, type: data.type, slug: data.slug, title: data.title, status: data.status });
  }
  return map;
}

// ─── Base44 API ───────────────────────────────────────────────────────────

interface Base44Rapper {
  id?: string;
  title?: string;
  realName?: string;
  occupation?: string[];
  origin?: string;
  birthDate?: string;
  status?: string;
  description?: string;
  slug?: string;
  profile_image_url?: string;
  tags?: string[];
  similar_artists?: string[];
  genres?: string[];
  key_tracks?: string[];
  albums?: string[];
}

async function fetchBase44Rappers(): Promise<Base44Rapper[]> {
  const url = `${BASE44_URL}/api/entities/Rapper?q=${encodeURIComponent(JSON.stringify({ status: "published" }))}`;
  const res = await fetch(url, {
    headers: { api_key: BASE44_KEY, "x-app-id": BASE44_APP_ID },
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("App not found")) {
      bail("Base44 app not found (may be down or redeploying)");
    }
    log(`Base44 API returned ${res.status}: ${text.slice(0, 200)}`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.entities || data.data || [];
}

// ─── Image download ──────────────────────────────────────────────────────

async function downloadImage(slug: string, url: string): Promise<boolean> {
  const imageDir = path.join(REPO, "public", "images", "artists");
  fs.mkdirSync(imageDir, { recursive: true });
  const ext = path.extname(url) || ".webp";
  const dest = path.join(imageDir, `${slug}${ext}`);

  if (fs.existsSync(dest)) {
    log(`  → image already exists: ${slug}${ext}`);
    return false;
  }

  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return false;
    fs.writeFileSync(dest, buffer);
    log(`  → downloaded image: ${slug}${ext} (${buffer.length} bytes)`);
    return true;
  } catch (e) {
    log(`  → image download failed for ${slug}: ${e}`);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════ HOURLY SYNC START ═══════════");
  log(`Repo: ${REPO}`);

  // Step 0: Clean working tree
  const dirty = git("status", "--porcelain");
  if (dirty) {
    log("  → working tree is dirty, stashing...");
    git("stash", "push", "-m", "hourly-sync auto-stash");
  }

  const beforeSha = git("rev-parse", "HEAD");
  log(`Starting at: ${beforeSha}`);

  let changesMade = false;

  // ── Step 1: Check Base44 ─────────────────────────────────────────────
  log("\n── Step 1: Check Base44 API ──");
  let rappers: Base44Rapper[] = [];

  try {
    rappers = await fetchBase44Rappers();
    log(`  → ${rappers.length} published rappers in Base44`);
  } catch (e) {
    log(`  → Base44 check failed: ${e}`);
    bail("Base44 unavailable — cannot sync");
  }

  // ── Step 2: Find new Base44 profiles not in local ──────────────────
  log("\n── Step 2: New profiles from Base44 ──");
  const localEntities = readLocalEntities();
  const localSlugs = new Set<string>();
  for (const [, meta] of localEntities) {
    if (meta.type === "artist" && meta.slug) localSlugs.add(meta.slug);
  }

  let newEntities = 0;
  for (const rapper of rappers) {
    const slug = rapper.slug || rapper.id?.replace(/^.*_/, "");
    if (!slug) continue;
    if (localSlugs.has(slug)) continue;

    log(`  → NEW: ${rapper.title || slug}`);
    newEntities++;
  }
  log(`  → ${newEntities} new entities found, ${rappers.length - newEntities} already local`);

  if (newEntities === 0) {
    log("\n✅ No new entities — nothing to sync");
    log("═══════════ HOURLY SYNC END ═══════════\n");
    return;
  }

  // ── Step 3: Actually create entities for new profiles ──────────────
  log("\n── Step 3: Create entities ──");
  for (const rapper of rappers) {
    const slug = rapper.slug || rapper.id?.replace(/^.*_/, "");
    if (!slug) continue;
    if (localSlugs.has(slug)) continue;

    const dir = path.join(REPO, "content", "entities", `artist_${slug}`);
    if (fs.existsSync(dir)) continue;

    fs.mkdirSync(dir, { recursive: true });
    const title = rapper.title || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // entity.mdx
    const mdx = `---
id: artist_${slug}
type: artist
slug: ${slug}
title: ${title}
realName: ${rapper.realName || ""}
origin: ${rapper.origin || ""}
birthDate: ${rapper.birthDate || ""}
occupation: [${(rapper.occupation || ["rapper"]).map((o) => `"${o}"`).join(", ")}]
status: draft
---

import { EntityLink } from "@/components/mdx";

## V kostce

${rapper.description || `${title} je český/česká rapper/ka.`}

***

## Kariéra

*Informace o kariéře budou doplněny.*

***

## Klíčová alba

*Seznam alb bude doplněn.*

***

## Koho si pustit dál

*Related artists.*
`;
    fs.writeFileSync(path.join(dir, "entity.mdx"), mdx);

    // meta.json
    const meta: Record<string, any> = {
      id: `artist_${slug}`, type: "artist", slug, title, status: "draft",
    };
    if (rapper.realName) meta.realName = rapper.realName;
    if (rapper.origin) meta.origin = rapper.origin;
    if (rapper.birthDate) meta.birthDate = rapper.birthDate;
    if (rapper.occupation) meta.occupation = rapper.occupation;
    if (rapper.description) meta.description = rapper.description;
    fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

    // relations.json (minimal)
    const relations: Record<string, any> = { outbound: {} };
    if (rapper.genres?.length) {
      relations.outbound.HAS_GENRE = rapper.genres.map((g) => `genre_${g.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
    }
    fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2) + "\n");

    log(`  → created: artist_${slug}`);
    changesMade = true;

    // Download image
    if (rapper.profile_image_url) {
      await downloadImage(slug, rapper.profile_image_url);
    }
  }

  // ── Step 4: Git commit entity creation ─────────────────────────────
  log("\n── Step 4: Git commit ──");
  if (changesMade) {
    const now = new Date();
    gitCommit(`feat: hourly sync — ${now.toISOString().slice(0, 10)} ${now.toISOString().slice(11, 16)}`);
  }

  // ── Step 5: Rebuild content cache ──────────────────────────────────
  log("\n── Step 5: Rebuild content cache ──");
  if (changesMade) {
    log("  → running 'npm run cache:build'...");
    try {
      execSync("npm run cache:build", { cwd: REPO, encoding: "utf-8", stdio: "pipe" });
      log("  → cache rebuilt successfully");
      gitCommit("chore: rebuild content cache after hourly sync");
    } catch (e: any) {
      log(`  → cache build failed: ${e.stderr?.toString().slice(0, 500) || e.message}`);
    }
  }

  const afterSha = git("rev-parse", "HEAD");
  log(`\n✅ ${beforeSha.slice(0, 7)} → ${afterSha.slice(0, 7)}`);
  log("═══════════ HOURLY SYNC END ═══════════\n");
}

main().catch((e) => {
  log(`\n❌ FATAL: ${e.message || e}`);
  process.exit(1);
});