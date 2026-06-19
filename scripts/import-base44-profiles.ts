#!/usr/bin/env node
/**
 * import-base44-profiles.ts — Dopíše `profile.json` k existujícím artistům z Base44
 *
 * Co dělá:
 * 1. Stáhne všechna data z Base44 API
 * 2. Mapuje artist_name → RKG slug (normalizace diakritiky, speciálních znaků)
 * 3. Pokud existuje lokální artist_xxx entita, napíše k ní `profile.json`
 * 4. Pokud profile.json už existuje, přeskočí (idempotentní)
 *
 * Usage: npx tsx scripts/import-base44-profiles.ts
 * Usage (force overwrite): FORCE=1 npx tsx scripts/import-base44-profiles.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const REPO = path.resolve(__dirname, "..");
const LOG_FILE = path.join(REPO, "logs", "import-base44-profiles.log");

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

function git(...args: string[]): string {
  try {
    return execSync(`git ${args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(" ")}`, {
      cwd: REPO, encoding: "utf-8",
    }).trim();
  } catch (e: any) {
    log(`git ${args.join(" ")} failed: ${e.message}`);
    return "";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Normalizace jména pro mapování — odstraní diakritiku a speciální znaky */
function normalizeName(name: string): string {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // odstraní diakritiku
    .replace(/['´`]/g, "") // odstraní apostrofy
    .replace(/[^a-z0-9\s]/g, " ") // ostatní speciální znaky na mezery
    .replace(/\s+/g, " ")
    .trim();
}

function getLocalArtistSlugs(): Map<string, string> {
  const entitiesDir = path.join(REPO, "content", "entities");
  const slugs = new Map<string, string>();
  if (!fs.existsSync(entitiesDir)) return slugs;
  for (const entry of fs.readdirSync(entitiesDir)) {
    if (entry.startsWith("artist_")) {
      const slug = entry.replace("artist_", "");
      slugs.set(slug, entry);
    }
  }
  return slugs;
}

function getSlugAliases(): Map<string, string> {
  return new Map([
    ["fuck-kult", "fvck-kvlt"],
    ["separ-7", "separ"],
    // Add any other manual mappings here
  ]);
}

function hasProfile(entityDir: string): boolean {
  return fs.existsSync(path.join(entityDir, "profile.json"));
}

// ─── Base44 API ───────────────────────────────────────────────────────────

interface Base44Rapper {
  id: string;
  artist_name?: string;
  country?: string;
  city?: string;
  birth_date?: string;
  real_name?: string;
  birth_place?: string;
  active_since?: string;
  label?: string;
  profile_image_url?: string;
  status?: string;
  short_intro?: string;
  one_liner?: string;
  career_summary?: string;
  what_makes_unique?: string;
  superpower?: string;
  influence?: string;
  generation_context?: string;
  controversy?: string;
  themes?: string[];
  style_tags?: string[];
  key_tracks?: string[];
  key_albums?: Array<{ title: string; year?: string; description?: string }>;
  similar_artists?: string[];
  fun_facts?: string[];
  sources?: string[];
  photo_confidence?: number;
  photo_source_url?: string;
  photo_filename?: string;
  scan_date?: string;
}

async function fetchAllRappers(): Promise<Base44Rapper[]> {
  const res = await fetch(`${BASE44_URL}/api/entities/Rapper`, {
    headers: { api_key: BASE44_KEY, "x-app-id": BASE44_APP_ID },
  });
  if (!res.ok) {
    log(`❌ Base44 returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.entities || data.data || [];
}

// ─── Build profile.json ──────────────────────────────────────────────────

function buildProfile(rapper: Base44Rapper): Record<string, unknown> {
  const profile: Record<string, unknown> = {};

  if (rapper.short_intro) profile.shortIntro = rapper.short_intro;
  if (rapper.what_makes_unique) profile.whatMakesUnique = rapper.what_makes_unique;
  if (rapper.career_summary) profile.careerSummary = rapper.career_summary;
  if (rapper.superpower) profile.superpower = rapper.superpower;
  if (rapper.one_liner) profile.oneLiner = rapper.one_liner;
  if (rapper.influence) profile.influence = rapper.influence;
  if (rapper.controversy) profile.controversy = rapper.controversy;
  if (rapper.generation_context) profile.generationContext = rapper.generation_context;

  if (rapper.style_tags?.length) profile.styleTags = rapper.style_tags;
  if (rapper.themes?.length) profile.themes = rapper.themes;

  if (rapper.key_albums?.length) {
    profile.keyAlbums = rapper.key_albums.map(a => ({
      title: a.title,
      year: a.year,
      description: a.description,
    }));
  }

  if (rapper.key_tracks?.length) profile.keyTracks = rapper.key_tracks;
  if (rapper.similar_artists?.length) profile.similarArtists = rapper.similar_artists;
  if (rapper.fun_facts?.length) profile.funFacts = rapper.fun_facts;
  if (rapper.sources?.length) profile.sources = rapper.sources;

  if (rapper.profile_image_url) profile.profileImageUrl = rapper.profile_image_url;
  if (rapper.photo_source_url) profile.photoSourceUrl = rapper.photo_source_url;
  if (rapper.photo_filename) profile.photoFilename = rapper.photo_filename;
  if (rapper.photo_confidence !== undefined && rapper.photo_confidence !== null) {
    profile.photoConfidence = rapper.photo_confidence;
  }
  if (rapper.scan_date) profile.scanDate = rapper.scan_date;

  return profile;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════ IMPORT BASE44 PROFILES ═══════════");
  const force = process.env.FORCE === "1";

  const localSlugs = getLocalArtistSlugs();
  const slugAliases = getSlugAliases();
  log(`Local artist entities: ${localSlugs.size}`);

  const rappers = await fetchAllRappers();
  if (rappers.length === 0) {
    log("❌ No rappers from Base44, bailing");
    return;
  }
  log(`Base44 rappers: ${rappers.length}`);

  // ── Build match index ────────────────────────────────────────────────
  // Map: normalized_base44_name → base44 slug
  const b44ByNormalized = new Map<string, Base44Rapper>();
  const b44BySlug = new Map<string, Base44Rapper>();
  const b44ByID = new Map<string, Base44Rapper>();

  for (const rapper of rappers) {
    const name = rapper.artist_name;
    if (!name) continue;

    const slug = slugify(name);
    const normalized = normalizeName(name);

    b44ByNormalized.set(normalized, rapper);
    b44BySlug.set(slug, rapper);
    b44ByID.set(normalized.replace(/\s+/g, ""), rapper);
    b44ByID.set(rapper.id, rapper);
  }

  // ── Match & write ────────────────────────────────────────────────────
  let written = 0;
  let skipped = 0;
  let unmatched: string[] = [];
  const writtenEntities: string[] = [];

  for (const [slug, entryName] of localSlugs) {
    let rapper: Base44Rapper | undefined;

    // Strategy 1: direct slug match
    rapper = b44BySlug.get(slug);

    // Strategy 2: normalized name match
    if (!rapper) {
      const norm = normalizeName(slug.replace(/-/g, " "));
      rapper = b44ByNormalized.get(norm);
    }

    // Strategy 3: alias
    if (!rapper) {
      const resolved = slugAliases.get(slug);
      if (resolved) rapper = b44BySlug.get(resolved);
    }

    // Strategy 4: ID match
    if (!rapper) {
      rapper = b44ByID.get(slug);
      if (!rapper) rapper = b44ByID.get(`artist_${slug}`);
    }

    if (!rapper) {
      unmatched.push(slug);
      continue;
    }

    const entityDir = path.join(REPO, "content", "entities", entryName);

    if (!force && hasProfile(entityDir)) {
      skipped++;
      continue;
    }

    const profile = buildProfile(rapper);
    if (Object.keys(profile).length === 0) {
      log(`  ⚠️  ${slug}: empty profile (no Base44 data for this artist)`);
      skipped++;
      continue;
    }

    fs.writeFileSync(
      path.join(entityDir, "profile.json"),
      JSON.stringify(profile, null, 2) + "\n",
    );

    log(`  ✓ ${slug}: written profile.json (${Object.keys(profile).length} fields)`);
    written++;
    writtenEntities.push(slug);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  log(`\n📊 Statistics:`);
  log(`  - Written: ${written}`);
  log(`  - Skipped (already has profile.json): ${skipped}`);
  log(`  - Unmatched (Base44 nemá data pro tyto lokální artisty): ${unmatched.length}`);

  if (unmatched.length > 0) {
    log(`\n⚠️  Unmatched (${unmatched.length}):`);
    for (const slug of unmatched) {
      log(`    - ${slug}`);
    }
  }

  if (written > 0) {
    git("add", "content/entities/");
    git("commit", "-m", `feat: import Base44 profiles (${writtenEntities.join(", ")})`);
    log(`  → committed`);
  }

  log("═══════════ END ═══════════\n");
}

main().catch((e) => {
  log(`\n❌ FATAL: ${e.message || e}`);
  process.exit(1);
});