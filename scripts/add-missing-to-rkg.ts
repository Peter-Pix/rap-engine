/**
 * Add missing 44rap artists to RKG + enrich existing ones with broken slugs
 *
 * 6 exist in RKG but weren't enriched (slug mismatch due to diakritika):
 *   7krát3, Čistychov, CA$HANOVA BULHAR, Řezník, D.Kop, Decky (as producer)
 *
 * 12 truly missing — create new entities:
 *   Pretorian, Radimo, Aless, Astral, Boy Wonder, Dušan Vlk,
 *   Palermo, Chacharski, Frank Flames, Haades, Johny Machette, Tenki
 *
 * Usage: npx tsx scripts/add-missing-to-rkg.ts
 */

import { getRappers, Base44Rapper } from "../src/lib/api/44rap";
import * as fs from "fs";
import * as path from "path";

const ENTITIES_DIR = path.resolve(__dirname, "../content/entities");
const BACKUP_DIR = path.resolve(__dirname, "../.backups/add-missing");

interface MetaJson {
  id?: string;
  type?: string;
  slug?: string;
  title?: string;
  realName?: string;
  birthDate?: string;
  origin?: string;
  activeSince?: string;
  occupation?: string[];
  label?: string;
  status?: string;
  city?: string;
  description?: string;
  publishedAt?: string;
  note?: string;
  [key: string]: unknown;
}

interface RelationsDict {
  albums: string[];
  artists: string[];
  genres: string[];
  influencedBy: string[];
  labels: string[];
  locations: string[];
  moods: string[];
  partOf: string[];
  related: string[];
  scenes: string[];
  styles: string[];
  themes: string[];
  tracks: string[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function backupFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const relPath = path.relative(ENTITIES_DIR, filePath);
  const backupPath = path.join(BACKUP_DIR, relPath);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
}

function readMeta(dir: string): MetaJson | null {
  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch {
    return null;
  }
}

function readMdx(dir: string): string | null {
  const mdxPath = path.join(dir, "entity.mdx");
  if (!fs.existsSync(mdxPath)) return null;
  return fs.readFileSync(mdxPath, "utf-8");
}

function readRelations(dir: string): RelationsDict {
  const relPath = path.join(dir, "relations.json");
  if (!fs.existsSync(relPath)) {
    return {
      albums: [], artists: [], genres: [], influencedBy: [],
      labels: [], locations: [], moods: [], partOf: [],
      related: [], scenes: [], styles: [], themes: [], tracks: [],
    };
  }
  try {
    return JSON.parse(fs.readFileSync(relPath, "utf-8"));
  } catch {
    return {
      albums: [], artists: [], genres: [], influencedBy: [],
      labels: [], locations: [], moods: [], partOf: [],
      related: [], scenes: [], styles: [], themes: [], tracks: [],
    };
  }
}

function enrichExisting(rapper: Base44Rapper, dir: string): void {
  const metaPath = path.join(dir, "meta.json");
  const relPath = path.join(dir, "relations.json");
  const mdxPath = path.join(dir, "entity.mdx");

  // 1. Meta — only add missing fields
  const meta = readMeta(dir) || {};
  let metaChanged = false;

  const additions: Record<string, string | string[] | undefined> = {
    activeSince: rapper.active_since,
    label: rapper.label,
    city: rapper.city,
    status: rapper.status,
  };

  for (const [key, value] of Object.entries(additions)) {
    if (value && !(meta as any)[key]) {
      (meta as any)[key] = value;
      metaChanged = true;
    }
  }

  if (!meta.occupation && rapper.style_tags?.length) {
    meta.occupation = ["rapper"];
    metaChanged = true;
  }

  if (metaChanged) {
    backupFile(metaPath);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  }

  // 2. Relations — add new
  const relations = readRelations(dir);
  let relChanged = false;

  // Ensure all keys exist
  const defaultKeys: (keyof RelationsDict)[] = [
    "albums", "artists", "genres", "influencedBy", "labels",
    "locations", "moods", "partOf", "related", "scenes",
    "styles", "themes", "tracks",
  ];
  for (const key of defaultKeys) {
    if (!relations[key]) {
      (relations as any)[key] = [];
      relChanged = true;
    }
  }

  if (rapper.label) {
    const ls = slugify(rapper.label);
    const key = `label_${ls}`;
    if (!relations.labels.includes(key)) {
      relations.labels.push(key);
      relChanged = true;
    }
  }

  if (rapper.similar_artists?.length) {
    for (const s of rapper.similar_artists) {
      const sk = `artist_${slugify(s)}`;
      if (!relations.related.includes(sk)) {
        relations.related.push(sk);
        relChanged = true;
      }
    }
  }

  if (rapper.style_tags?.length) {
    for (const t of rapper.style_tags) {
      const ts = slugify(t);
      if (!relations.styles.includes(ts)) {
        relations.styles.push(ts);
        relChanged = true;
      }
    }
  }

  if (rapper.themes?.length) {
    for (const t of rapper.themes) {
      const ts = slugify(t);
      if (!relations.themes.includes(ts)) {
        relations.themes.push(ts);
        relChanged = true;
      }
    }
  }

  if (rapper.city) {
    const cs = slugify(rapper.city);
    const key = `location_${cs}`;
    if (!relations.locations.includes(key)) {
      relations.locations.push(key);
      relChanged = true;
    }
  }

  if (rapper.country) {
    const key = `location_${rapper.country.toLowerCase()}`;
    if (!relations.locations.includes(key)) {
      relations.locations.push(key);
      relChanged = true;
    }
  }

  if (relChanged) {
    backupFile(relPath);
    fs.writeFileSync(relPath, JSON.stringify(relations, null, 2) + "\n");
  }

  // 3. MDX — append 44rap section if not already there
  const mdx = readMdx(dir);
  if (mdx && !mdx.includes("<!-- 44rap-import -->")) {
    const appendix = buildMdxAppendix(rapper);
    if (appendix) {
      backupFile(mdxPath);
      fs.writeFileSync(mdxPath, mdx + "\n" + appendix);
    }
  }

  console.log(`   ✅ ${rapper.artist_name} — enriched existing`);
}

function buildMdxAppendix(rapper: Base44Rapper): string | null {
  const parts: string[] = [];
  parts.push("");
  parts.push("<!-- 44rap-import -->");
  parts.push("");

  if (rapper.short_intro) {
    parts.push(rapper.short_intro);
    parts.push("");
  }

  if (rapper.career_summary) {
    parts.push("## Kariéra");
    parts.push("");
    parts.push(rapper.career_summary);
    parts.push("");
  }

  if (rapper.what_makes_unique) {
    parts.push("## V čem je unikátní");
    parts.push("");
    parts.push(rapper.what_makes_unique);
    parts.push("");
  }

  if (rapper.influence) {
    parts.push("## Vliv");
    parts.push("");
    parts.push(rapper.influence);
    parts.push("");
  }

  if (rapper.controversy) {
    parts.push("## Kontroverze");
    parts.push("");
    parts.push(rapper.controversy);
    parts.push("");
  }

  if (rapper.superpower) {
    parts.push("## Superpower");
    parts.push("");
    parts.push(rapper.superpower);
    parts.push("");
  }

  if (rapper.one_liner) {
    parts.push(`> ${rapper.one_liner}`);
    parts.push("");
  }

  if (rapper.generation_context) {
    parts.push("## Generační kontext");
    parts.push("");
    parts.push(rapper.generation_context);
    parts.push("");
  }

  if (rapper.style_tags?.length) {
    parts.push(`**Styly:** ${rapper.style_tags.join(", ")}`);
    parts.push("");
  }

  if (rapper.themes?.length) {
    parts.push(`**Témata:** ${rapper.themes.join(", ")}`);
    parts.push("");
  }

  if (rapper.fun_facts?.length) {
    parts.push("### Zajímavosti");
    parts.push("");
    for (const f of rapper.fun_facts) {
      parts.push(`- ${f}`);
    }
    parts.push("");
  }

  if (rapper.key_albums?.length) {
    parts.push("## Klíčová alba");
    parts.push("");
    parts.push("| Album | Rok | Popis |");
    parts.push("|-------|-----|-------|");
    for (const a of rapper.key_albums) {
      const desc = (a.description || "").replace(/\n/g, " ").slice(0, 80);
      parts.push(`| ${a.title} | ${a.year || "?"} | ${desc} |`);
    }
    parts.push("");
  }

  if (rapper.key_tracks?.length) {
    parts.push("## Klíčové tracky");
    parts.push("");
    for (const t of rapper.key_tracks) {
      parts.push(`- ${t}`);
    }
    parts.push("");
  }

  if (parts.length <= 2) return null;
  return parts.join("\n");
}

function createNewEntity(rapper: Base44Rapper): void {
  const slug = slugify(rapper.artist_name);
  const dir = path.join(ENTITIES_DIR, `artist_${slug}`);

  if (fs.existsSync(dir)) {
    console.log(`   ⚠️  ${rapper.artist_name} — dir already exists, enriching instead`);
    enrichExisting(rapper, dir);
    return;
  }

  fs.mkdirSync(dir, { recursive: true });

  // meta.json
  const meta: MetaJson = {
    id: `artist_${slug}`,
    type: "artist",
    slug,
    title: rapper.artist_name,
    description: rapper.short_intro || `${rapper.artist_name} — rapper${rapper.city ? ` z ${rapper.city}` : ""}.`,
    publishedAt: "2024-01-01",
  };

  if (rapper.real_name) meta.realName = rapper.real_name;
  if (rapper.birth_place) meta.origin = rapper.birth_place;
  if (rapper.birth_date) meta.birthDate = rapper.birth_date;
  if (rapper.active_since) meta.activeSince = rapper.active_since;
  if (rapper.label) meta.label = rapper.label;
  if (rapper.city) meta.city = rapper.city;
  if (rapper.status) meta.status = rapper.status;
  meta.occupation = ["rapper"];

  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  // relations.json
  const relations: RelationsDict = {
    albums: [], artists: [], genres: [], influencedBy: [],
    labels: [], locations: [], moods: [], partOf: [],
    related: [], scenes: [], styles: [], themes: [], tracks: [],
  };

  if (rapper.label) {
    relations.labels.push(`label_${slugify(rapper.label)}`);
  }

  if (rapper.similar_artists?.length) {
    for (const s of rapper.similar_artists) {
      relations.related.push(`artist_${slugify(s)}`);
    }
  }

  if (rapper.style_tags?.length) {
    for (const t of rapper.style_tags) {
      relations.styles.push(slugify(t));
    }
  }

  if (rapper.themes?.length) {
    for (const t of rapper.themes) {
      relations.themes.push(slugify(t));
    }
  }

  if (rapper.city) {
    relations.locations.push(`location_${slugify(rapper.city)}`);
  }

  if (rapper.country) {
    relations.locations.push(`location_${rapper.country.toLowerCase()}`);
  }

  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2) + "\n");

  // entity.mdx
  const mdx = buildMdxContent(rapper);
  fs.writeFileSync(path.join(dir, "entity.mdx"), mdx);

  console.log(`   🆕 ${rapper.artist_name} — created`);
}

function buildMdxContent(rapper: Base44Rapper): string {
  const parts: string[] = [];
  const slug = slugify(rapper.artist_name);

  parts.push("---");
  parts.push(`id: artist_${slug}`);
  parts.push(`type: artist`);
  parts.push(`title: "${rapper.artist_name}"`);
  if (rapper.real_name) parts.push(`realName: "${rapper.real_name}"`);
  if (rapper.birth_place) parts.push(`origin: "${rapper.birth_place}"`);
  if (rapper.birth_date) parts.push(`birthDate: "${rapper.birth_date}"`);
  if (rapper.city) parts.push(`city: "${rapper.city}"`);
  if (rapper.active_since) parts.push(`activeSince: "${rapper.active_since}"`);
  if (rapper.label) parts.push(`label: "${rapper.label}"`);
  if (rapper.status) parts.push(`status: "${rapper.status}"`);
  parts.push("---");
  parts.push("");

  if (rapper.short_intro) {
    parts.push(rapper.short_intro);
    parts.push("");
  }

  if (rapper.career_summary) {
    parts.push("## Kariéra");
    parts.push("");
    parts.push(rapper.career_summary);
    parts.push("");
  }

  if (rapper.what_makes_unique) {
    parts.push("## V čem je unikátní");
    parts.push("");
    parts.push(rapper.what_makes_unique);
    parts.push("");
  }

  if (rapper.influence) {
    parts.push("## Vliv");
    parts.push("");
    parts.push(rapper.influence);
    parts.push("");
  }

  if (rapper.controversy) {
    parts.push("## Kontroverze");
    parts.push("");
    parts.push(rapper.controversy);
    parts.push("");
  }

  if (rapper.superpower) {
    parts.push("## Superpower");
    parts.push("");
    parts.push(rapper.superpower);
    parts.push("");
  }

  if (rapper.one_liner) {
    parts.push(`> ${rapper.one_liner}`);
    parts.push("");
  }

  if (rapper.generation_context) {
    parts.push("## Generační kontext");
    parts.push("");
    parts.push(rapper.generation_context);
    parts.push("");
  }

  if (rapper.style_tags?.length) {
    parts.push(`**Styly:** ${rapper.style_tags.join(", ")}`);
    parts.push("");
  }

  if (rapper.themes?.length) {
    parts.push(`**Témata:** ${rapper.themes.join(", ")}`);
    parts.push("");
  }

  if (rapper.fun_facts?.length) {
    parts.push("### Zajímavosti");
    parts.push("");
    for (const f of rapper.fun_facts) {
      parts.push(`- ${f}`);
    }
    parts.push("");
  }

  if (rapper.key_albums?.length) {
    parts.push("## Klíčová alba");
    parts.push("");
    parts.push("| Album | Rok | Popis |");
    parts.push("|-------|-----|-------|");
    for (const a of rapper.key_albums) {
      const desc = (a.description || "").replace(/\n/g, " ").slice(0, 80);
      parts.push(`| ${a.title} | ${a.year || "?"} | ${desc} |`);
    }
    parts.push("");
  }

  if (rapper.key_tracks?.length) {
    parts.push("## Klíčové tracky");
    parts.push("");
    for (const t of rapper.key_tracks) {
      parts.push(`- ${t}`);
    }
    parts.push("");
  }

  if (rapper.sources?.length) {
    parts.push("## Zdroje");
    parts.push("");
    for (const s of rapper.sources) {
      parts.push(`- ${s}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

async function main() {
  console.log("📡 Fetching rappers from 44rap...");
  const result = await getRappers({ limit: 200 });
  if (result.error) {
    console.error("❌ Failed:", result.error);
    process.exit(1);
  }
  const rappers = result.data ?? [];
  console.log(`   Found ${rappers.length} rappers\n`);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Map of 44rap name → RKG dir for the 6 that exist with broken slugs
  const existingMap: Record<string, string> = {
    "7krát3": "artist_7krat3",
    "Čistychov": "artist_cistychov",
    "CA$HANOVA BULHAR": "artist_ca-hanova-bulhar",
    "Řezník": "artist_reznik",
    "D.Kop": "artist_d-kop",
    "Decky": "producer_decky",
  };

  let enriched = 0;
  let created = 0;
  let skipped = 0;

  for (const rapper of rappers) {
    const slug = slugify(rapper.artist_name);
    const dir = path.join(ENTITIES_DIR, `artist_${slug}`);

    if (fs.existsSync(dir)) {
      // Already handled by main import — skip
      skipped++;
      continue;
    }

    // Check if it exists with a different slug
    const existingDir = existingMap[rapper.artist_name];
    if (existingDir) {
      const fullDir = path.join(ENTITIES_DIR, existingDir);
      if (fs.existsSync(fullDir)) {
        enrichExisting(rapper, fullDir);
        enriched++;
        continue;
      }
    }

    // Truly missing — create
    createNewEntity(rapper);
    created++;
  }

  console.log(`\n🎉 Done!`);
  console.log(`   Created: ${created}`);
  console.log(`   Enriched (existing): ${enriched}`);
  console.log(`   Skipped (already done): ${skipped}`);
  console.log(`   Total: ${rappers.length}`);
  console.log(`\n📦 Backups in: ${BACKUP_DIR}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
