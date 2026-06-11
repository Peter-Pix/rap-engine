#!/usr/bin/env npx tsx
/**
 * Import entities from the reference project (rap-engine-second-trial)
 * into our graph-folder format (content/entities/).
 *
 * Usage:
 *   npx tsx scripts/import-reference-data.ts --phase=genres    --dry-run
 *   npx tsx scripts/import-reference-data.ts --phase=genres
 *   npx tsx scripts/import-reference-data.ts --phase=labels
 *   npx tsx scripts/import-reference-data.ts --phase=artists   --dry-run
 *   npx tsx scripts/import-reference-data.ts --phase=artists
 *   npx tsx scripts/import-reference-data.ts --phase=albums    --dry-run
 *   npx tsx scripts/import-reference-data.ts --phase=all       --dry-run
 *   npx tsx scripts/import-reference-data.ts --phase=all       --limit=5
 */

import fs from "node:fs";
import path from "node:path";

// ─── Config ──────────────────────────────────────────────────────────────

const REFERENCE_ROOT = path.resolve(
  process.cwd(),
  "..",
  "Project_1/rap-engine-second-trial",
);

const OUR_ROOT = process.cwd();
const ENTITIES_DIR = path.join(OUR_ROOT, "content/entities");
const LEGACY_DIRS: Record<string, string> = {
  artist: "raperi",
  genre: "zanry",
  label: "labely",
  album: "alba",
  track: "skladby",
};

// ─── CLI ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  // Handle --name=value
  for (const a of args) {
    if (a.startsWith(`--${name}=`)) return a.substring(`--${name}=`.length);
  }
  // Handle --name value
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  return undefined;
}

const phase = arg("phase") || "all";
const dryRun = args.includes("--dry-run");
const limit = parseInt(arg("limit") || "999999", 10);
const force = args.includes("--force");
const verbose = args.includes("--verbose");

const PHASES = ["genres", "labels", "artists", "albums"] as const;
type Phase = (typeof PHASES)[number];

// ─── Parse YAML frontmatter ──────────────────────────────────────────────

function parseFrontmatter(
  filePath: string,
): { fm: Record<string, unknown>; body: string } | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;

  const fmRaw = m[1];
  const body = content.substring(m[0].length).trim();

  const fm: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  // Flush pending list
  function flushList() {
    if (currentKey && currentList !== null) {
      fm[currentKey] = currentList;
      currentList = null;
      currentKey = null;
    }
  }

  for (const line of fmRaw.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      flushList();
      const key = kv[1];
      const val = kv[2].trim();

      if (val === "true" || val === "false") {
        fm[key] = val === "true";
      } else if (val === "" || val === "[]") {
        fm[key] = [];
      } else if (val.startsWith("[") && val.endsWith("]")) {
        const inner = val.slice(1, -1);
        fm[key] = inner
          ? inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
          : [];
      } else if (val.startsWith('"') && val.endsWith('"')) {
        fm[key] = val.slice(1, -1);
      } else if (/^-?\d+(\.\d+)?$/.test(val)) {
        fm[key] = val.includes(".") ? parseFloat(val) : parseInt(val, 10);
      } else {
        fm[key] = val;
      }
      currentKey = key;
      currentList = null;
    } else if (line.trim().startsWith("- ") && currentKey) {
      if (currentList === null) currentList = [];
      const item = line.trim().slice(2).trim().replace(/^["']|["']$/g, "");
      currentList.push(item);
    }
  }
  flushList();

  return { fm, body };
}

// ─── Type mapping ────────────────────────────────────────────────────────

const ENTITY_TYPE_MAP: Record<string, string> = {
  rapper: "artist",
  zpevak: "artist",
  singer: "artist",
  crew: "collective",
  producer: "producer",
};

function mapEntityType(refType: string): string {
  return ENTITY_TYPE_MAP[refType] || refType;
}

// ─── Route prefix per type ───────────────────────────────────────────────

const TYPE_ROUTE_MAP: Record<string, string> = {
  artist: "/raperi",
  album: "/alba",
  track: "/skladby",
  genre: "/zanry",
  style: "/styly",
  theme: "/temata",
  mood: "/nalady",
  scene: "/sceny",
  label: "/labely",
  location: "/lokality",
  article: "/clanky",
  collective: "/kolektivy",
  producer: "/producenti",
  event: "/akce",
};

// ─── Existing entity IDs (avoid duplicates) ──────────────────────────────

function loadExistingIds(): Set<string> {
  const ids = new Set<string>();
  if (!fs.existsSync(ENTITIES_DIR)) return ids;
  for (const entry of fs.readdirSync(ENTITIES_DIR)) {
    if (entry.startsWith(".") || !fs.statSync(path.join(ENTITIES_DIR, entry)).isDirectory())
      continue;
    ids.add(entry);
  }
  return ids;
}

// ─── Stats ───────────────────────────────────────────────────────────────

const stats = { created: 0, skipped: 0, errors: 0, dryRun: 0 };
const logEntries: string[] = [];

function log(msg: string) {
  logEntries.push(msg);
  if (verbose) console.log(msg);
}

// ─── Import: Genres ──────────────────────────────────────────────────────

function importGenres(existing: Set<string>) {
  const srcDir = path.join(REFERENCE_ROOT, "content/zanry");
  if (!fs.existsSync(srcDir)) {
    console.log("  ⚠️ No genre source dir found");
    return;
  }

  const files = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".mdx"))
    .slice(0, limit);

  console.log(`  📂 ${files.length} genre files found`);

  for (const file of files) {
    const parsed = parseFrontmatter(path.join(srcDir, file));
    if (!parsed) {
      log(`  ❌ ${file}: parse failed`);
      stats.errors++;
      continue;
    }

    const { fm, body } = parsed;
    const slug = (fm.slug as string) || file.replace(".mdx", "");
    const id = `genre_${slug}`;

    // Check if entity already exists (graph-folder or legacy)
    if (existing.has(id)) {
      log(`  ⏭️ ${id}: already exists`);
      stats.skipped++;
      continue;
    }

    // Check legacy overlap
    if (legacyExists("genre", slug)) {
      log(`  ⏭️ ${id}: exists in legacy (will be migrated separately)`);
      stats.skipped++;
      continue;
    }

    // Build meta.json
    const meta: Record<string, unknown> = {
      id,
      type: "genre" as const,
      title: fm.title as string,
      description: (fm.description as string) || "",
      slug,
      publishedAt: (fm.publishedAt as string) || new Date().toISOString().split("T")[0],
    };
    if (fm.origin) meta.origin = fm.origin;
    if (fm.image) meta.image = fm.image;

    // Build relations.json
    const relations: Record<string, string[]> = {};
    if (fm.relatedGenres && Array.isArray(fm.relatedGenres)) {
      relations.related = (fm.relatedGenres as string[]).map(
        (g: string) => `genre_${g}`,
      );
    }

    // Strip H1 from body
    const content = stripTitleHeading(body, (fm.title as string) || "");

    if (dryRun) {
      log(`  🧪 [DRY-RUN] ${id}: ${meta.title} — ${relations.related?.length || 0} relations`);
      stats.dryRun++;
    } else {
      writeEntity(id, meta, relations, content);
      existing.add(id);
    }
  }
}

// ─── Import: Labels ──────────────────────────────────────────────────────

function importLabels(existing: Set<string>) {
  const srcDir = path.join(REFERENCE_ROOT, "content/labely");
  if (!fs.existsSync(srcDir)) {
    console.log("  ⚠️ No label source dir found");
    return;
  }

  const files = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".mdx"))
    .slice(0, limit);

  console.log(`  📂 ${files.length} label files found`);

  for (const file of files) {
    const parsed = parseFrontmatter(path.join(srcDir, file));
    if (!parsed) {
      log(`  ❌ ${file}: parse failed`);
      stats.errors++;
      continue;
    }

    const { fm, body } = parsed;
    const slug = (fm.slug as string) || file.replace(".mdx", "");
    const id = `label_${slug}`;

    if (existing.has(id)) {
      log(`  ⏭️ ${id}: already exists`);
      stats.skipped++;
      continue;
    }

    const meta: Record<string, unknown> = {
      id,
      type: "label" as const,
      title: fm.title as string,
      description: (fm.description as string) || "",
      slug,
      publishedAt: (fm.publishedAt as string) || new Date().toISOString().split("T")[0],
    };
    if (fm.founded) meta.founded = fm.founded;
    if (fm.founder) meta.founder = fm.founder;
    if (fm.location) meta.location = fm.location;
    if (fm.country) meta.country = fm.country;
    if (fm.website) meta.website = fm.website;

    // Relations: members (artists), genre
    const relations: Record<string, string[]> = {};
    if (fm.members && Array.isArray(fm.members)) {
      relations.artists = (fm.members as string[]).map(
        (a: string) => `artist_${a}`,
      );
    }
    if (fm.founders && Array.isArray(fm.founders)) {
      relations.artists = [
        ...(relations.artists || []),
        ...(fm.founders as string[]).map((a: string) => `artist_${a}`),
      ];
    }
    if (fm.genre && Array.isArray(fm.genre)) {
      relations.genres = (fm.genre as string[]).map(
        (g: string) => `genre_${g}`,
      );
    }

    const content = stripTitleHeading(body, (fm.title as string) || "");

    if (dryRun) {
      log(`  🧪 [DRY-RUN] ${id}: ${meta.title} — ${relations.artists?.length || 0} artists, ${relations.genres?.length || 0} genres`);
      stats.dryRun++;
    } else {
      writeEntity(id, meta, relations, content);
      existing.add(id);
    }
  }
}

// ─── Import: Artists ─────────────────────────────────────────────────────

function importArtists(existing: Set<string>) {
  const srcDir = path.join(REFERENCE_ROOT, "content/raperi");
  if (!fs.existsSync(srcDir)) {
    console.log("  ⚠️ No artist source dir found");
    return;
  }

  const files = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".mdx"))
    .slice(0, limit);

  console.log(`  📂 ${files.length} artist files found`);

  for (const file of files) {
    const parsed = parseFrontmatter(path.join(srcDir, file));
    if (!parsed) {
      log(`  ❌ ${file}: parse failed`);
      stats.errors++;
      continue;
    }

    const { fm, body } = parsed;
    const slug = (fm.slug as string) || file.replace(".mdx", "");
    const refEntityType = (fm.entityType as string) || "rapper";
    const ourType = mapEntityType(refEntityType);
    const id = `${ourType}_${slug}`;

    if (existing.has(id)) {
      log(`  ⏭️ ${id}: already exists`);
      stats.skipped++;
      continue;
    }

    // Check legacy
    if (legacyExists(ourType, slug)) {
      log(`  ⏭️ ${id}: exists in legacy (skipping — migrate later)`);
      stats.skipped++;
      continue;
    }

    // Build meta
    const meta: Record<string, unknown> = {
      id,
      type: ourType as string,
      title: fm.title as string,
      description: (fm.description as string) || "",
      slug,
      publishedAt: (fm.publishedAt as string) || new Date().toISOString().split("T")[0],
    };

    // Artist-specific extras
    if (ourType === "artist") {
      if (fm.realName) meta.realName = fm.realName;
      if (fm.born || fm.birthDate) meta.born = fm.born || fm.birthDate;
      if (fm.origin || fm.birthPlace) meta.origin = fm.origin || fm.birthPlace;
      if (fm.activeSince) meta.activeSince = fm.activeSince;
      if (fm.status) meta.status = fm.status;
      if (fm.aliases && Array.isArray(fm.aliases)) meta.aliases = fm.aliases;
      if (fm.image) meta.image = fm.image;
      if (fm.city) meta.city = fm.city;
    }

    // Collective
    if (ourType === "collective") {
      if (fm.members && Array.isArray(fm.members)) meta.members = fm.members;
      if (fm.origin) meta.origin = fm.origin;
      if (fm.activeSince) meta.activeSince = fm.activeSince;
      if (fm.image) meta.image = fm.image;
    }

    // Producer
    if (ourType === "producer") {
      if (fm.realName) meta.realName = fm.realName;
      if (fm.origin) meta.origin = fm.origin;
      if (fm.image) meta.image = fm.image;
    }

    // Build relations
    const relations: Record<string, string[]> = {};

    // genres → HAS_GENRE
    if (fm.genre && Array.isArray(fm.genre)) {
      relations.genres = (fm.genre as string[]).map(
        (g: string) => `genre_${g}`,
      );
    }

    // labels → BELONGS_TO_LABEL
    if (fm.labels && Array.isArray(fm.labels)) {
      relations.labels = (fm.labels as string[]).map(
        (l: string) => `label_${l}`,
      );
    } else if (fm.label && Array.isArray(fm.label)) {
      relations.labels = (fm.label as string[]).map(
        (l: string) => `label_${l}`,
      );
    }

    // relatedRappers → COLLABORATED (artists)
    if (fm.relatedRappers && Array.isArray(fm.relatedRappers)) {
      relations.artists = (fm.relatedRappers as string[])
        .map((a: string) => {
          const aType = knownEntityType(a);
          return aType ? `${aType}_${a}` : `artist_${a}`;
        })
        .filter(Boolean);
    }

    // relatedAlbums → albums
    if (fm.relatedAlbums && Array.isArray(fm.relatedAlbums)) {
      relations.albums = (fm.relatedAlbums as string[]).map(
        (a: string) => `album_${a}`,
      );
    }

    // crew → HAS_MEMBER (collective → artist)
    if (fm.members && Array.isArray(fm.members) && ourType !== "artist") {
      relations.members = (fm.members as string[])
        .map((a: string) => `artist_${a}`);
    }

    const content = stripTitleHeading(body, (fm.title as string) || "");

    if (dryRun) {
      const relParts: string[] = [];
      if (relations.genres?.length) relParts.push(`${relations.genres.length} genres`);
      if (relations.labels?.length) relParts.push(`${relations.labels.length} labels`);
      if (relations.artists?.length) relParts.push(`${relations.artists.length} artists`);
      log(`  🧪 [DRY-RUN] ${id} (${ourType}): ${meta.title} — ${relParts.join(", ") || "no relations"}`);
      stats.dryRun++;
    } else {
      writeEntity(id, meta, relations, content);
      existing.add(id);
    }
  }
}

// ─── Import: Albums ──────────────────────────────────────────────────────

function importAlbums(existing: Set<string>) {
  const srcDir = path.join(REFERENCE_ROOT, "content/alba");
  if (!fs.existsSync(srcDir)) {
    console.log("  ⚠️ No album source dir found");
    return;
  }

  const files = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".mdx"))
    .slice(0, limit);

  console.log(`  📂 ${files.length} album files found`);

  for (const file of files) {
    const parsed = parseFrontmatter(path.join(srcDir, file));
    if (!parsed) {
      log(`  ❌ ${file}: parse failed`);
      stats.errors++;
      continue;
    }

    const { fm, body } = parsed;
    const slug = (fm.slug as string) || file.replace(".mdx", "");
    const id = `album_${slug}`;

    // Skip if neither the artist rapperSlug nor the label exists in our system
    const artistSlug = fm.rapperSlug as string;
    const labelSlug = fm.labelSlug as string;
    const artistId = artistSlug ? `artist_${artistSlug}` : null;
    const labelId = labelSlug ? `label_${labelSlug}` : null;

    // For import, only skip if the album entity already exists
    if (existing.has(id)) {
      log(`  ⏭️ ${id}: already exists`);
      stats.skipped++;
      continue;
    }

    if (legacyExists("album", slug)) {
      log(`  ⏭️ ${id}: exists in legacy`);
      stats.skipped++;
      continue;
    }

    const meta: Record<string, unknown> = {
      id,
      type: "album" as const,
      title: fm.title as string,
      description: (fm.description as string || fm.summary as string) || "",
      slug,
      publishedAt: (fm.publishedAt as string) || new Date().toISOString().split("T")[0],
    };
    if (fm.year) meta.year = fm.year;
    if (fm.rating) meta.rating = fm.rating;
    if (fm.image) meta.image = fm.image;

    const relations: Record<string, string[]> = {};

    if (artistId) relations.artists = [artistId];
    if (fm.features && Array.isArray(fm.features)) {
      relations.artists = [
        ...(relations.artists || []),
        ...(fm.features as string[]).map((a: string) => `artist_${a}`),
      ];
    }
    if (labelId) relations.labels = [labelId];
    if (fm.genre && Array.isArray(fm.genre)) {
      relations.genres = (fm.genre as string[]).map(
        (g: string) => `genre_${g}`,
      );
    }
    if (fm.producers && Array.isArray(fm.producers)) {
      relations.producers = (fm.producers as string[]).map(
        (p: string) => `producer_${p}`,
      );
    }

    // Deduplicate artist relations
    if (relations.artists) {
      relations.artists = [...new Set(relations.artists)];
    }

    const content = stripTitleHeading(body, (fm.title as string) || "");

    if (dryRun) {
      log(`  🧪 [DRY-RUN] ${id}: ${meta.title} (${fm.year})`);
      stats.dryRun++;
    } else {
      writeEntity(id, meta, relations, content);
      existing.add(id);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function legacyExists(type: string, slug: string): boolean {
  const dirName = LEGACY_DIRS[type];
  if (!dirName) return false;
  const legacyPath = path.join(OUR_ROOT, "content", dirName, slug);
  return fs.existsSync(legacyPath) && fs.statSync(legacyPath).isDirectory();
}

/** Track known types per slug from our data set */
const knownSlugTypes = new Map<string, string>();

function knownEntityType(slug: string): string | null {
  if (knownSlugTypes.has(slug)) return knownSlugTypes.get(slug)!;
  // Check existing entities
  for (const [type, dir] of Object.entries(LEGACY_DIRS)) {
    const p = path.join(OUR_ROOT, "content", dir, slug);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      knownSlugTypes.set(slug, type);
      return type;
    }
  }
  return null;
}

function stripTitleHeading(body: string, title: string): string {
  const titleRegex = new RegExp(`^#\\s+${escapeRegExp(title)}\\s*`, "i");
  let content = body.replace(titleRegex, "").trim();

  // Also strip the reference project's first paragraph link pattern:
  // [Title](/raperi/slug) from [Album](/alba/slug) (year).
  // which is metadata, not content
  const metaLine = content.split("\n")[0] || "";
  if (metaLine.match(/^\[.+\]\(\/.+\)/)) {
    content = content.substring(content.indexOf("\n") + 1).trim();
  }

  return content;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function writeEntity(
  id: string,
  meta: Record<string, unknown>,
  relations: Record<string, string[]>,
  content: string,
) {
  const dir = path.join(ENTITIES_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  // Sort meta keys: id, type, title, description, slug first, then alpha
  const priorityKeys = ["id", "type", "title", "description", "slug"];
  const sortedMeta: Record<string, unknown> = {};
  for (const k of priorityKeys) {
    if (k in meta) sortedMeta[k] = meta[k];
  }
  for (const k of Object.keys(meta).sort()) {
    if (!(k in sortedMeta)) sortedMeta[k] = meta[k];
  }

  fs.writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify(sortedMeta, null, 2) + "\n",
  );

  // Sort relation keys alphabetically
  const sortedRel: Record<string, string[]> = {};
  for (const k of Object.keys(relations).sort()) {
    sortedRel[k] = [...new Set(relations[k])].sort();
  }
  fs.writeFileSync(
    path.join(dir, "relations.json"),
    JSON.stringify(sortedRel, null, 2) + "\n",
  );

  fs.writeFileSync(path.join(dir, "entity.mdx"), content.trim() + "\n");

  log(`  ✅ ${id}: created`);
  stats.created++;
}

// ─── Main ────────────────────────────────────────────────────────────────

function main() {
  console.log("🚀 Import from reference project\n");

  const existing = loadExistingIds();
  console.log(`📋 Existing graph-folder entities: ${existing.size}`);
  console.log(
    `🔧 Mode: ${dryRun ? "DRY RUN 🧪" : "LIVE ✍️"}${force ? " (force overwrite)" : ""}${limit < 999999 ? ` (limit: ${limit})` : ""}\n`,
  );

  if (phase === "all" || phase === "genres") {
    console.log("━━━ PHASE 1: Genres ━━━");
    importGenres(existing);
    console.log(
      `   ✅ ${stats.created} created, ⏭️ ${stats.skipped} skipped, ❌ ${stats.errors} errors, 🧪 ${stats.dryRun} dry-run\n`,
    );
  }

  if (phase === "all" || phase === "labels") {
    console.log("━━━ PHASE 2: Labels ━━━");
    importLabels(existing);
    console.log(
      `   ✅ ${stats.created} created, ⏭️ ${stats.skipped} skipped, ❌ ${stats.errors} errors, 🧪 ${stats.dryRun} dry-run\n`,
    );
  }

  if (phase === "all" || phase === "artists") {
    console.log("━━━ PHASE 3: Artists ━━━");
    importArtists(existing);
    console.log(
      `   ✅ ${stats.created} created, ⏭️ ${stats.skipped} skipped, ❌ ${stats.errors} errors, 🧪 ${stats.dryRun} dry-run\n`,
    );
  }

  if (phase === "all" || phase === "albums") {
    console.log("━━━ PHASE 4: Albums ━━━");
    importAlbums(existing);
    console.log(
      `   ✅ ${stats.created} created, ⏭️ ${stats.skipped} skipped, ❌ ${stats.errors} errors, 🧪 ${stats.dryRun} dry-run\n`,
    );
  }

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `📊 TOTAL: ${stats.created} created, ⏭️ ${stats.skipped} skipped, ❌ ${stats.errors} errors, 🧪 ${stats.dryRun} dry-run`,
  );
  console.log(`📋 Entities now: ${existing.size}\n`);

  if (dryRun) {
    console.log("🧪 Dry run complete — no files were written.");
    if (verbose && logEntries.length > 0) {
      console.log(`\n📝 Detailed log (${logEntries.length} entries):`);
      for (const entry of logEntries) console.log(entry);
    }
  } else {
    console.log("🎉 Import complete!");
  }
}

main();
