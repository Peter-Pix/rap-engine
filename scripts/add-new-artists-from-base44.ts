#!/usr/bin/env node
/**
 * add-new-artists-from-base44.ts — Přidá nové artisty z Base44 do lokální DB
 *
 * Co dělá:
 * 1. Vezme data z Base44 API
 * 2. Najde ty, co neexistují lokálně (podle artist_name → slug)
 * 3. Vytvoří entity stub (entity.mdx + meta.json + relations.json)
 *    - Správné edge types: RELATED_ARTIST, HAS_ALBUM, SIGNED_TO, ORIGINATES_FROM, HAS_STYLE
 *    - Skipuje targety, co v databázi neexistují (validuje přes content-cache)
 * 4. Stáhne profilovou fotku, přidá do images.ts
 * 5. Git commitne jako jeden commit
 *
 * Bezpečnost:
 * - Nikdy nepřepisuje existující entity (přeskočí)
 * - Když target neexistuje, vynechá se
 * - Idempotentní — běh 2x neudělá nic navíc
 *
 * Usage: npx tsx scripts/add-new-artists-from-base44.ts
 */

import { resolveLabel } from "../src/lib/content/label-resolver";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const REPO = path.resolve(__dirname, "..");
const LOG_FILE = path.join(REPO, "logs", "add-new-artists.log");
const IMAGE_DIR = path.join(REPO, "public", "images", "artists");
const IMAGES_TS = path.join(REPO, "src", "lib", "content", "images.ts");
const CACHE_ENTITIES = path.join(REPO, ".content-cache", "entities.json");

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

function loadCacheIds(): Set<string> {
  if (!fs.existsSync(CACHE_ENTITIES)) return new Set();
  const e = JSON.parse(fs.readFileSync(CACHE_ENTITIES, "utf-8"));
  return new Set(Object.keys(e));
}

function getLocalArtistSlugs(): Set<string> {
  const entitiesDir = path.join(REPO, "content", "entities");
  const slugs = new Set<string>();
  if (!fs.existsSync(entitiesDir)) return slugs;
  for (const entry of fs.readdirSync(entitiesDir)) {
    if (entry.startsWith("artist_")) {
      slugs.add(entry.replace("artist_", ""));
    }
  }
  return slugs;
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
  influence?: string;
  generation_context?: string;
  controversy?: string;
  themes?: string[];
  style_tags?: string[];
  key_tracks?: string[];
  key_albums?: { title: string; year: string; description: string }[];
  similar_artists?: string[];
  fun_facts?: string[];
  sources?: string[];
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

// ─── Create entity files ──────────────────────────────────────────────────

function createEntity(rapper: Base44Rapper, slug: string, validIds: Set<string>) {
  const dir = path.join(REPO, "content", "entities", `artist_${slug}`);
  if (fs.existsSync(dir)) return false;

  fs.mkdirSync(dir, { recursive: true });

  const title = rapper.artist_name || slug;
  const country = rapper.country || "";
  const isC = country === "CZ";
  const isS = country === "SK";

  // ── entity.mdx ──
  const frontmatter = [
    "---",
    `id: artist_${slug}`,
    "type: artist",
    `slug: ${slug}`,
    `title: ${title}`,
  ];
  if (rapper.real_name) frontmatter.push(`realName: ${rapper.real_name}`);
  if (rapper.city) frontmatter.push(`origin: ${rapper.city}${isS ? ", Slovensko" : isC ? ", Česko" : ""}`);
  if (rapper.birth_date) frontmatter.push(`birthDate: ${rapper.birth_date}`);
  frontmatter.push(`occupation: [rapper, textař]`);
  frontmatter.push("status: draft");
  frontmatter.push("---");
  frontmatter.push("");

  const mdxBody: string[] = [
    "import { EntityLink } from \"@/components/mdx\";",
    "",
    `## ${rapper.one_liner || "Profil"}`,
    "",
    rapper.short_intro || `${title} — profil se připravuje.`,
    "",
    "***",
    "",
    "## Kdo je",
    "",
    rapper.what_makes_unique || `*Profil ${title} se připravuje.*`,
    "",
    "***",
    "",
    "## Kariéra",
    "",
    rapper.career_summary || `*Kariéra ${title} se připravuje.*`,
    "",
    "***",
    "",
    "## Vliv a kontext",
    "",
    rapper.influence
      ? `${rapper.influence}${rapper.generation_context ? "\n\n" + rapper.generation_context : ""}`
      : rapper.generation_context || `*Kontext se připravuje.*`,
  ];

  if (rapper.controversy) {
    mdxBody.push("", "***", "", "## Kontroverze", "", rapper.controversy);
  }

  if (rapper.fun_facts?.length) {
    mdxBody.push("", "***", "", "## Fun facts", "", ...rapper.fun_facts.map(f => `- ${f}`));
  }

  if (rapper.key_albums?.length) {
    mdxBody.push(
      "", "***", "", "## Klíčová alba", "",
      ...rapper.key_albums.map(a => `- **${a.title}** (${a.year}) — ${a.description || ""}`)
    );
  }

  if (rapper.key_tracks?.length) {
    mdxBody.push("", "***", "", "## Klíčové tracky", "", ...rapper.key_tracks.map(t => `- ${t}`));
  }

  if (rapper.style_tags?.length) {
    mdxBody.push("", "***", "", "## Styl", "", rapper.style_tags.join(", "));
  }

  if (rapper.similar_artists?.length) {
    mdxBody.push(
      "", "***", "", "## Koho si pustit dál", "",
      "Související: " + rapper.similar_artists.map(a => `**${a}**`).join(", ") + "."
    );
  }

  if (rapper.sources?.length) {
    mdxBody.push(
      "", "***", "", "## Zdroje", "",
      ...rapper.sources.map(s => `- [${new URL(s).hostname}](${s})`)
    );
  }

  fs.writeFileSync(
    path.join(dir, "entity.mdx"),
    frontmatter.join("\n") + "\n\n" + mdxBody.join("\n") + "\n"
  );

  // ── meta.json ──
  const meta: Record<string, any> = {
    id: `artist_${slug}`, type: "artist", slug, title, status: "draft",
  };
  if (rapper.real_name) meta.realName = rapper.real_name;
  if (rapper.city) meta.origin = `${rapper.city}${isS ? ", Slovensko" : isC ? ", Česko" : ""}`;
  if (rapper.birth_date) meta.birthDate = rapper.birth_date;
  if (rapper.short_intro) meta.description = rapper.short_intro;
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  // ── relations.json — FLAT schema, validní target IDs ──
  const relations: Record<string, string[]> = {};

  // labels: → SIGNED_TO
  if (rapper.label) {
    const target = `label_${slugify(rapper.label)}`;
    if (validIds.has(target)) relations.labels = [target];
  }

  // related: → RELATED_ARTIST
  if (rapper.similar_artists?.length) {
    const targets = rapper.similar_artists
      .map(a => `artist_${slugify(a)}`)
      .filter(t => validIds.has(t));
    if (targets.length) relations.related = [...new Set(targets)];
  }

  // locations: → ORIGINATES_FROM
  if (rapper.city) {
    const target = `location_${slugify(rapper.city)}`;
    if (validIds.has(target)) relations.locations = [target];
  }

  // albums: → HAS_ALBUM
  if (rapper.key_albums?.length) {
    const targets = rapper.key_albums
      .map(a => `album_${slugify(a.title)}`)
      .filter(t => validIds.has(t));
    if (targets.length) relations.albums = [...new Set(targets)];
  }

  // styles: → HAS_STYLE
  if (rapper.style_tags?.length) {
    const targets = rapper.style_tags
      .map(t => `style_${slugify(t)}`)
      .filter(t => validIds.has(t));
    if (targets.length) relations.styles = [...new Set(targets)];
  }

  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2) + "\n");

  log(`  ✓ created artist_${slug}/ (${Object.keys(relations).length} relations: ${Object.keys(relations).join(", ")})`);
  return true;
}

// ─── Image handling ───────────────────────────────────────────────────────

async function downloadImage(url: string, dest: string): Promise<boolean> {
  if (fs.existsSync(dest)) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return false;
    fs.writeFileSync(dest, buffer);
    return true;
  } catch { return false; }
}

function addToImagesTs(slug: string, ext: string) {
  const content = fs.readFileSync(IMAGES_TS, "utf-8");
  if (content.includes(`'${slug}'`)) return;
  const path = `/images/artists/${slug}${ext}`;
  const entry = `  '${slug}': '${path}',`;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "};") {
      lines.splice(i, 0, entry);
      break;
    }
  }
  fs.writeFileSync(IMAGES_TS, lines.join("\n"));
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════ ADD NEW ARTISTS FROM BASE44 ═══════════");
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  const validIds = loadCacheIds();
  log(`Valid cache IDs: ${validIds.size}`);

  const localArtistSlugs = getLocalArtistSlugs();
  log(`Local artist slugs: ${localArtistSlugs.size}`);

  const rappers = await fetchAllRappers();
  if (rappers.length === 0) {
    log("❌ No rappers from Base44, bailing");
    return;
  }
  log(`Base44 rappers: ${rappers.length}`);

  let created = 0;
  let downloaded = 0;
  const newEntities: string[] = [];

  for (const rapper of rappers) {
    const name = rapper.artist_name;
    if (!name) continue;

    const slug = slugify(name);
    if (localArtistSlugs.has(slug)) continue;
    if (localArtistSlugs.has(name.toLowerCase()) || localArtistSlugs.has(name.toLowerCase().replace(/\s+/g, ''))) continue;

    log(`🆕 New artist: ${name} (${rapper.country || "?"}) → ${slug}`);

    const ok = createEntity(rapper, slug, validIds);
    if (!ok) continue;
    created++;
    newEntities.push(slug);

    // Download image
    if (rapper.profile_image_url) {
      const urlPath = new URL(rapper.profile_image_url).pathname;
      const ext = path.extname(urlPath) || ".webp";
      const dest = path.join(IMAGE_DIR, `${slug}${ext}`);
      const dl = await downloadImage(rapper.profile_image_url, dest);
      if (dl) {
        const size = fs.statSync(dest).size;
        log(`  ✓ image: ${slug}${ext} (${(size / 1024).toFixed(0)}KB)`);
        addToImagesTs(slug, ext);
        downloaded++;
      } else {
        log(`  ⚠️ image download failed for ${slug}`);
      }
    }
  }

  log(`\n📊 Statistics:`);
  log(`  - Created entities: ${created}`);
  log(`  - Downloaded images: ${downloaded}`);

  if (created > 0) {
    git("add", "content/entities/", "public/images/artists/", "src/lib/content/images.ts");
    git("commit", "-m", `feat: add new artists from Base44 (${newEntities.join(", ")})`);
    log(`  → committed`);
  }

  log("═══════════ END ═══════════\n");
}

main().catch((e) => {
  log(`\n❌ FATAL: ${e.message || e}`);
  process.exit(1);
});