/**
 * Structured MDX card generator.
 *
 * Pro entity s krátkým placeholder obsahem (<500 znaků) generuje
 * rich structured card z dostupných dat (meta, relations, tracks.json).
 *
 * Generuje SKUTEČNÉ STRUKTUROVANÉ DATA — ne AI fluff.
 * Každá karta obsahuje:
 *   - Frontmatter (YAML)
 *   - Klíčové fakty (Definice, label, město, atd.)
 *   - Tracklist (pokud existuje)
 *   - Vztahy (label/artist/featuring)
 *   - Zdroje (pokud existují)
 *
 * APPEND-ONLY: nikdy nepřepisuje rich content (>500 znaků).
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { existsSync } from "fs";

const CONTENT_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/content/entities";
const BACKUP_ROOT = "/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph/.backups/structured-cards";

const MIN_LENGTH_FOR_SKIP = 500;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

async function backup(path: string) {
  if (!existsSync(path)) return null;
  const content = await readFile(path, "utf-8");
  const hash = createHash("md5").update(content).digest("hex").slice(0, 8);
  await mkdir(BACKUP_ROOT, { recursive: true });
  const filename = path.split("/").pop();
  const backupPath = join(BACKUP_ROOT, `${filename}_${Date.now()}_${hash}`);
  await copyFile(path, backupPath);
  return backupPath;
}

interface MetaData {
  id: string;
  type: string;
  slug: string;
  title: string;
  description?: string;
  publishedAt?: string;
  year?: number;
  realName?: string;
  birthDate?: string;
  origin?: string;
  city?: string;
  activeSince?: string;
  label?: string;
  occupation?: string | string[];
  image?: string;
  releaseDate?: string;
  trackCount?: number;
  durationSec?: number;
  deezerId?: number;
  deezerUrl?: string;
  fanCount?: number;
  status?: string;
  isStub?: boolean;
  [k: string]: any;
}

async function readMeta(slug: string): Promise<MetaData | null> {
  const path = join(CONTENT_ROOT, slug, "meta.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return null;
  }
}

async function readRelations(slug: string): Promise<Record<string, any> | null> {
  const path = join(CONTENT_ROOT, slug, "relations.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return null;
  }
}

async function readTracks(slug: string): Promise<any | null> {
  const path = join(CONTENT_ROOT, slug, "tracks.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return null;
  }
}

function formatDuration(sec: number | undefined): string {
  if (!sec) return "?";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTotalDuration(sec: number | undefined): string {
  if (!sec) return "?";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} hod ${m} min`;
  return `${m} min`;
}

function getEntityTitle(id: string): string {
  // Synchronous title lookup
  return id.replace(/^(album|artist|label|location|genre|mood|theme|style|scene|collective|producer|track|article)_/, "").replace(/-/g, " ");
}

// ============== TEMPLATES ==============

async function generateAlbumCard(slug: string): Promise<string> {
  const meta = await readMeta(slug);
  const rel = await readRelations(slug);
  const tracks = await readTracks(slug);

  if (!meta) return "";

  const title = meta.title || slug;
  const year = meta.year || (meta.releaseDate ? new Date(meta.releaseDate).getFullYear() : null);

  // Get artist names
  const artistNames: string[] = [];
  const artistSlugs = (rel?.artists || []) as string[];
  for (const aSlug of artistSlugs) {
    const aMeta = await readMeta(aSlug);
    if (aMeta) artistNames.push(`[${aMeta.title}](/${aSlug.replace("_", "/")})`);
  }

  // Label
  const labels: string[] = [];
  for (const lSlug of (rel?.labels || []) as string[]) {
    const lMeta = await readMeta(lSlug);
    if (lMeta) labels.push(`[${lMeta.title}](/${lSlug.replace("_", "/")})`);
  }

  // Genres/styles/themes/moods
  const tags: string[] = [];
  for (const k of ["genres", "styles", "themes", "moods"]) {
    for (const tSlug of (rel?.[k] || []) as string[]) {
      const tMeta = await readMeta(tSlug);
      if (tMeta) tags.push(`[${tMeta.title}](/${tSlug.replace("_", "/")})`);
    }
  }

  // Build MDX
  let mdx = `---\nid: ${slug}\ntype: album\ntitle: "${title}"\n---\n\n`;
  mdx += `# ${title}\n\n`;

  // Quick facts
  const facts: string[] = [];
  if (artistNames.length > 0) {
    facts.push(`**Interpret:** ${artistNames.join(", ")}`);
  }
  if (year) {
    facts.push(`**Rok:** ${year}`);
  }
  if (labels.length > 0) {
    facts.push(`**Label:** ${labels.join(", ")}`);
  }
  if (meta.trackCount || tracks?.total_tracks) {
    facts.push(`**Počet skladeb:** ${meta.trackCount || tracks.total_tracks}`);
  }
  if (meta.durationSec || tracks?.total_duration_sec) {
    facts.push(`**Délka:** ${formatTotalDuration(meta.durationSec || tracks.total_duration_sec)}`);
  }
  if (meta.upc) {
    facts.push(`**UPC:** ${meta.upc}`);
  }

  if (facts.length > 0) {
    mdx += `> ${facts.join(" · ")}\n\n`;
  }

  // Original description (if any)
  if (meta.description && !meta.description.includes("Album obsahuje celkem")) {
    mdx += `${meta.description}\n\n`;
  }

  // Tracklist
  if (tracks?.tracks && tracks.tracks.length > 0) {
    mdx += `## Tracklist\n\n`;
    mdx += `| # | Název | Featuring | Délka |\n`;
    mdx += `|---|-------|-----------|-------|\n`;
    for (const t of tracks.tracks.slice(0, 30)) {
      const feat = t.feat && t.feat.length > 0 ? t.feat.join(", ") : "—";
      mdx += `| ${t.position} | ${t.title} | ${feat} | ${formatDuration(t.duration_sec)} |\n`;
    }
    if (tracks.tracks.length > 30) {
      mdx += `\n*+${tracks.tracks.length - 30} dalších skladeb*\n`;
    }
    mdx += `\n`;
  }

  // Tags
  if (tags.length > 0) {
    mdx += `## Tagy\n\n${tags.join(" · ")}\n\n`;
  }

  // Sources
  const sources: string[] = [];
  if (meta.deezerUrl) sources.push(`[Deezer](${meta.deezerUrl})`);
  if (meta.image) sources.push(`[Cover](${meta.image})`);
  if (sources.length > 0) {
    mdx += `## Zdroje\n\n${sources.join(" · ")}\n\n`;
  }

  return mdx;
}

async function generateArtistCard(slug: string): Promise<string> {
  const meta = await readMeta(slug);
  const rel = await readRelations(slug);

  if (!meta) return "";

  const title = meta.title || slug;

  // Get label, location names
  const labels: string[] = [];
  for (const lSlug of (rel?.labels || []) as string[]) {
    const lMeta = await readMeta(lSlug);
    if (lMeta) labels.push(`[${lMeta.title}](/${lSlug.replace("_", "/")})`);
  }

  const locations: string[] = [];
  for (const lSlug of (rel?.locations || []) as string[]) {
    const lMeta = await readMeta(lSlug);
    if (lMeta) locations.push(`[${lMeta.title}](/${lSlug.replace("_", "/")})`);
  }

  // Albums count
  const albums = (rel?.albums || []) as string[];
  const albumCount = albums.length;

  // Genres
  const tags: string[] = [];
  for (const k of ["genres", "styles"]) {
    for (const tSlug of (rel?.[k] || []) as string[]) {
      const tMeta = await readMeta(tSlug);
      if (tMeta) tags.push(`[${tMeta.title}](/${tSlug.replace("_", "/")})`);
    }
  }

  let mdx = `---\nid: ${slug}\ntype: artist\ntitle: "${title}"\n---\n\n`;
  mdx += `# ${title}\n\n`;

  // Quick facts
  const facts: string[] = [];
  if (meta.realName) facts.push(`**Vlastní jméno:** ${meta.realName}`);
  if (meta.birthDate) {
    const birthYear = new Date(meta.birthDate).getFullYear();
    facts.push(`**Narozen:** ${meta.birthDate} (${birthYear})`);
  }
  if (meta.city || meta.origin) {
    const city = meta.city || meta.origin.split(",")[0].trim();
    facts.push(`**Město:** ${locations.find((l) => l.includes(city)) || city}`);
  }
  if (labels.length > 0) {
    facts.push(`**Label:** ${labels.join(", ")}`);
  }
  if (meta.activeSince) {
    facts.push(`**Aktivní od:** ${meta.activeSince}`);
  }
  if (Array.isArray(meta.occupation)) {
    facts.push(`**Pozice:** ${meta.occupation.join(", ")}`);
  } else if (typeof meta.occupation === "string") {
    facts.push(`**Pozice:** ${meta.occupation}`);
  }
  if (albumCount > 0) {
    facts.push(`**Alb v RKG:** ${albumCount}`);
  }
  if (meta.fanCount) {
    facts.push(`**Deezer fanoušků:** ${meta.fanCount.toLocaleString()}`);
  }
  if (meta.status) {
    facts.push(`**Status:** ${meta.status}`);
  }

  if (facts.length > 0) {
    mdx += `> ${facts.join(" · ")}\n\n`;
  }

  // Original description (if any) — skip if it's the placeholder
  if (meta.description && !meta.description.toLowerCase().includes("rapper") && meta.description.length > 30) {
    mdx += `${meta.description}\n\n`;
  } else if (meta.origin) {
    mdx += `${title} je ${meta.occupation || "rapper"} z ${meta.origin}.\n\n`;
  } else if (meta.realName) {
    mdx += `${title} (vlastním jménem ${meta.realName}) je ${meta.occupation || "rapper"} na CZ/SK rapové scéně.\n\n`;
  } else {
    // Fallback description from meta
    const fallbackDesc = meta.description || `${title} je rapper na CZ/SK rapové scéně.`;
    mdx += `${fallbackDesc}\n\n`;
  }

  // Tags
  if (tags.length > 0) {
    mdx += `## Styly a žánry\n\n${tags.join(" · ")}\n\n`;
  }

  // Related
  const related = (rel?.related || []) as string[];
  if (related.length > 0) {
    const relatedNames: string[] = [];
    for (const rSlug of related.slice(0, 8)) {
      const rMeta = await readMeta(rSlug);
      if (rMeta) relatedNames.push(`[${rMeta.title}](/${rSlug.replace("_", "/")})`);
    }
    if (relatedNames.length > 0) {
      mdx += `## Související\n\n${relatedNames.join(" · ")}\n\n`;
    }
  }

  // Sources
  const sources: string[] = [];
  if (meta.deezerUrl) sources.push(`[Deezer](${meta.deezerUrl})`);
  if (sources.length > 0) {
    mdx += `## Zdroje\n\n${sources.join(" · ")}\n\n`;
  }

  return mdx;
}

async function generateLabelCard(slug: string): Promise<string> {
  const meta = await readMeta(slug);
  const rel = await readRelations(slug);

  if (!meta) return "";

  const title = meta.title || slug;

  // Get artists on label
  const artists: string[] = [];
  for (const aSlug of (rel?.artists || []) as string[]) {
    const aMeta = await readMeta(aSlug);
    if (aMeta) artists.push(`[${aMeta.title}](/${aSlug.replace("_", "/")})`);
  }

  const locations: string[] = [];
  for (const lSlug of (rel?.locations || []) as string[]) {
    const lMeta = await readMeta(lSlug);
    if (lMeta) locations.push(`[${lMeta.title}](/${lSlug.replace("_", "/")})`);
  }

  let mdx = `---\nid: ${slug}\ntype: label\ntitle: "${title}"\n---\n\n`;
  mdx += `# ${title}\n\n`;

  const facts: string[] = [];
  if (meta.location) facts.push(`**Sídlo:** ${meta.location}`);
  if (locations.length > 0) facts.push(`**Město:** ${locations.join(", ")}`);
  if (meta.founded) facts.push(`**Založen:** ${meta.founded}`);
  if (artists.length > 0) facts.push(`**Umělců:** ${artists.length}`);
  if (meta.country) facts.push(`**Země:** ${meta.country}`);

  if (facts.length > 0) {
    mdx += `> ${facts.join(" · ")}\n\n`;
  }

  // Original description (if any) — skip if it's the placeholder
  if (meta.description && meta.description.length > 30 && !meta.description.includes("vydavatelství")) {
    mdx += `${meta.description}\n\n`;
  } else if (meta.location) {
    mdx += `${title} je ${meta.country === "SK" ? "slovenské" : "české"} hudební vydavatelství se sídlem v ${meta.location}.\n\n`;
  } else {
    const fallbackDesc = meta.description || `${title} je hudební label na CZ/SK rapové scéně.`;
    mdx += `${fallbackDesc}\n\n`;
  }

  if (artists.length > 0) {
    mdx += `## Umělci\n\n${artists.join(", ")}\n\n`;
  }

  return mdx;
}

async function generateLocationCard(slug: string): Promise<string> {
  const meta = await readMeta(slug);
  const rel = await readRelations(slug);

  if (!meta) return "";

  const title = meta.title || slug;

  const artists: string[] = [];
  for (const aSlug of (rel?.artists || []) as string[]) {
    const aMeta = await readMeta(aSlug);
    if (aMeta) artists.push(`[${aMeta.title}](/${aSlug.replace("_", "/")})`);
  }

  let mdx = `---\nid: ${slug}\ntype: location\ntitle: "${title}"\n---\n\n`;
  mdx += `# ${title}\n\n`;

  const facts: string[] = [];
  if (meta.country) facts.push(`**Země:** ${meta.country}`);
  if (artists.length > 0) facts.push(`**Umělců z města:** ${artists.length}`);

  if (facts.length > 0) {
    mdx += `> ${facts.join(" · ")}\n\n`;
  }

  if (meta.description) {
    mdx += `${meta.description}\n\n`;
  }

  if (artists.length > 0) {
    mdx += `## Umělci\n\n${artists.join(", ")}\n\n`;
  }

  return mdx;
}

async function generateSimpleCard(slug: string, typeName: string, typeLabel: string): Promise<string> {
  const meta = await readMeta(slug);
  const rel = await readRelations(slug);

  if (!meta) return "";

  const title = meta.title || slug;

  const entities = (rel?.[typeName] || []) as string[];
  const relatedNames: string[] = [];
  for (const eSlug of entities.slice(0, 10)) {
    const eMeta = await readMeta(eSlug);
    if (eMeta) relatedNames.push(`[${eMeta.title}](/${eSlug.replace("_", "/")})`);
  }

  let mdx = `---\nid: ${slug}\ntype: ${typeName}\ntitle: "${title}"\n---\n\n`;
  mdx += `# ${title}\n\n`;

  if (meta.description && meta.description.length > 30 && !meta.description.includes("Profil")) {
    mdx += `${meta.description}\n\n`;
  } else {
    mdx += `${title} — ${typeLabel.toLowerCase()} v rámci české a slovenské rapové scény.\n\n`;
  }

  if (relatedNames.length > 0) {
    mdx += `## Související\n\n${relatedNames.join(" · ")}\n\n`;
  }

  return mdx;
}

// ============== MAIN ==============

async function main() {
  console.log("🎴 Structured MDX card generator\n");

  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const targetSlugs = args.filter((a) => !a.startsWith("--"));
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;

  const dirs = await readdir(CONTENT_ROOT, { withFileTypes: true });

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytesAdded = 0;

  const stats: Record<string, number> = {};

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const slug = dir.name;

    // Filter by target slugs if specified
    if (targetSlugs.length > 0 && !targetSlugs.includes(slug)) continue;

    const type = slug.split("_")[0] as string;

    // Only process specific types
    if (!["album", "artist", "label", "location", "genre", "mood", "theme", "style", "collective", "scene", "producer"].includes(type)) {
      continue;
    }

    const mdxPath = join(CONTENT_ROOT, slug, "entity.mdx");
    if (!existsSync(mdxPath)) continue;

    const existing = await readFile(mdxPath, "utf-8");

    // Skip if rich
    if (existing.length >= MIN_LENGTH_FOR_SKIP) {
      skipped++;
      continue;
    }

    let newMdx = "";
    try {
      switch (type) {
        case "album":
          newMdx = await generateAlbumCard(slug);
          break;
        case "artist":
          newMdx = await generateArtistCard(slug);
          break;
        case "label":
          newMdx = await generateLabelCard(slug);
          break;
        case "location":
          newMdx = await generateLocationCard(slug);
          break;
        default:
          newMdx = await generateSimpleCard(slug, type, type);
      }
    } catch (e) {
      console.error(`  ❌ ${slug}: ${(e as Error).message}`);
      failed++;
      continue;
    }

    if (processed >= limit) break;

    if (!newMdx || newMdx.length < 50) {
      skipped++;
      continue;
    }

    if (isDryRun) {
      console.log(`\n━━━ DRY RUN: ${slug} ━━━`);
      console.log(newMdx.slice(0, 1500));
      if (newMdx.length > 1500) console.log(`... (+${newMdx.length - 1500} chars)`);
      processed++;
      stats[type] = (stats[type] || 0) + 1;
      continue;
    }

    // Backup + write
    await backup(mdxPath);
    await writeFile(mdxPath, newMdx, "utf-8");

    totalBytesAdded += newMdx.length - existing.length;
    processed++;
    stats[type] = (stats[type] || 0) + 1;

    if (processed % 50 === 0) {
      console.log(`  [${processed}] processed, +${(totalBytesAdded / 1024).toFixed(1)} KB`);
    }
  }

  console.log(`\n━━━ SUMMARY ━━━`);
  console.log(`  ✅ Processed: ${processed}`);
  console.log(`  ⏭️  Skipped (rich enough): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total bytes added: ${(totalBytesAdded / 1024).toFixed(1)} KB`);
  console.log(`\n  By type:`);
  for (const [t, c] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t}: ${c}`);
  }
  console.log(`\n✨ Hotovo!`);
}

main().catch((e) => {
  console.error("💥 Chyba:", e);
  process.exit(1);
});