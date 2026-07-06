/**
 * Import 44rap data into RKG (Rap Knowledge Graph) — SAFE MODE
 *
 * Rules:
 * 1. meta.json — only ADD fields that don't exist yet (never overwrite)
 * 2. entity.mdx — NEVER overwrite. Append 44rap data as appendix section.
 * 3. relations.json — only ADD new entries, never remove existing ones
 * 4. Everything is backed up to .backups/ before any write
 *
 * Usage: npx tsx scripts/import-44rap-to-rkg.ts
 */

import { getRappers, Base44Rapper } from "../src/lib/api/44rap";
import { resolveLabel } from "../src/lib/content/label-resolver";
import * as fs from "fs";
import * as path from "path";

const ENTITIES_DIR = path.resolve(__dirname, "../content/entities");
const BACKUP_DIR = path.resolve(__dirname, "../.backups/44rap-import");

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

function findEntityDir(slug: string): string | null {
  const dir = path.join(ENTITIES_DIR, `artist_${slug}`);
  if (fs.existsSync(dir)) return dir;
  return null;
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

function backupFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const relPath = path.relative(ENTITIES_DIR, filePath);
  const backupPath = path.join(BACKUP_DIR, relPath);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
}

function appendMdxSection(dir: string, rapper: Base44Rapper): boolean {
  const mdx = readMdx(dir);
  if (!mdx) return false;

  // Check if 44rap section already exists
  if (mdx.includes("<!-- 44rap-import -->")) {
    return false;
  }

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
    for (const fact of rapper.fun_facts) {
      parts.push(`- ${fact}`);
    }
    parts.push("");
  }

  if (rapper.key_albums?.length) {
    parts.push("## Klíčová alba");
    parts.push("");
    parts.push("| Album | Rok | Popis |");
    parts.push("|-------|-----|-------|");
    for (const album of rapper.key_albums) {
      const desc = (album.description || "").replace(/\n/g, " ").slice(0, 80);
      parts.push(`| ${album.title} | ${album.year || "?"} | ${desc} |`);
    }
    parts.push("");
  }

  if (rapper.key_tracks?.length) {
    parts.push("## Klíčové tracky");
    parts.push("");
    for (const track of rapper.key_tracks) {
      parts.push(`- ${track}`);
    }
    parts.push("");
  }

  if (parts.length <= 2) return false; // only the marker and empty lines

  const mdxPath = path.join(dir, "entity.mdx");
  backupFile(mdxPath);
  fs.writeFileSync(mdxPath, mdx + "\n" + parts.join("\n"));
  return true;
}

function updateMetaSafe(dir: string, rapper: Base44Rapper): boolean {
  const metaPath = path.join(dir, "meta.json");
  const meta = readMeta(dir) || {};
  let changed = false;

  // Only add fields that DON'T exist yet
  const additions: Record<string, string | string[] | undefined> = {
    activeSince: rapper.active_since,
    label: rapper.label,
    city: rapper.city,
    status: rapper.status,
  };

  for (const [key, value] of Object.entries(additions)) {
    if (value && !(meta as any)[key]) {
      (meta as any)[key] = value;
      changed = true;
    }
  }

  // Occupation: only if not set
  if (!meta.occupation && rapper.style_tags?.length) {
    meta.occupation = ["rapper"];
    changed = true;
  }

  if (changed) {
    backupFile(metaPath);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  }

  return changed;
}

function updateRelationsSafe(dir: string, rapper: Base44Rapper): boolean {
  const relPath = path.join(dir, "relations.json");
  const relations = readRelations(dir);
  let changed = false;

  // Ensure all expected keys exist
  const defaultKeys: (keyof RelationsDict)[] = [
    "albums", "artists", "genres", "influencedBy", "labels",
    "locations", "moods", "partOf", "related", "scenes",
    "styles", "themes", "tracks",
  ];
  for (const key of defaultKeys) {
    if (!relations[key]) {
      (relations as any)[key] = [];
      changed = true;
    }
  }

  // Label (canonical — prevents duplicate creation)
  if (rapper.label) {
    const labelId = resolveLabel(rapper.label);
    if (labelId && !relations.labels.includes(labelId)) {
      relations.labels.push(labelId);
      changed = true;
    }
  }

  // Similar artists → related
  if (rapper.similar_artists?.length) {
    for (const similar of rapper.similar_artists) {
      const similarSlug = slugify(similar);
      const key = `artist_${similarSlug}`;
      if (!relations.related.includes(key)) {
        relations.related.push(key);
        changed = true;
      }
    }
  }

  // Style tags → styles
  if (rapper.style_tags?.length) {
    for (const tag of rapper.style_tags) {
      const tagSlug = slugify(tag);
      if (!relations.styles.includes(tagSlug)) {
        relations.styles.push(tagSlug);
        changed = true;
      }
    }
  }

  // Themes
  if (rapper.themes?.length) {
    for (const theme of rapper.themes) {
      const themeSlug = slugify(theme);
      if (!relations.themes.includes(themeSlug)) {
        relations.themes.push(themeSlug);
        changed = true;
      }
    }
  }

  // City → location
  if (rapper.city) {
    const citySlug = slugify(rapper.city);
    const key = `location_${citySlug}`;
    if (!relations.locations.includes(key)) {
      relations.locations.push(key);
      changed = true;
    }
  }

  // Country → location
  if (rapper.country) {
    const countrySlug = rapper.country.toLowerCase();
    const key = `location_${countrySlug}`;
    if (!relations.locations.includes(key)) {
      relations.locations.push(key);
      changed = true;
    }
  }

  if (changed) {
    backupFile(relPath);
    fs.writeFileSync(relPath, JSON.stringify(relations, null, 2) + "\n");
  }

  return changed;
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

  // Create backup dir
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let metaUpdated = 0;
  let mdxAppended = 0;
  let relationsUpdated = 0;
  let skipped = 0;

  for (const rapper of rappers) {
    const slug = slugify(rapper.artist_name);
    const dir = findEntityDir(slug);

    if (!dir) {
      console.log(`   ⏭️  ${rapper.artist_name} — not in RKG, skipping`);
      skipped++;
      continue;
    }

    const mChanged = updateMetaSafe(dir, rapper);
    const rChanged = updateRelationsSafe(dir, rapper);
    const aChanged = appendMdxSection(dir, rapper);

    if (mChanged) metaUpdated++;
    if (aChanged) mdxAppended++;
    if (rChanged) relationsUpdated++;

    if (mChanged || aChanged || rChanged) {
      console.log(`   ✅ ${rapper.artist_name} — enriched`);
    } else {
      console.log(`   ➖ ${rapper.artist_name} — already up to date`);
    }
  }

  console.log(`\n🎉 Done!`);
  console.log(`   Meta updated: ${metaUpdated}`);
  console.log(`   MDX appended: ${mdxAppended}`);
  console.log(`   Relations updated: ${relationsUpdated}`);
  console.log(`   Skipped (not in RKG): ${skipped}`);
  console.log(`   Total: ${rappers.length}`);
  console.log(`\n📦 Backups in: ${BACKUP_DIR}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
