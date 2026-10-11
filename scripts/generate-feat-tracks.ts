#!/usr/bin/env -S npx tsx
/**
 * FÁZE 0 — Generátor entit skladeb pro feat. spolupráce.
 *
 * Problém: 6 068 skladeb v Deezer tracklistech, ale jen 427 entit `track_*`.
 * 202 feat skladeb (kde oba hosté jsou RKG artisti) nemá vlastní entitu →
 * Common Ground nevidí společné skladby.
 *
 * Co dělá:
 *   1. Projde všechny `album_*\/tracks.json` (Deezer tracklisty).
 *   2. Najde skladby s `feat[]`, kde primární i feat interpret matchují RKG.
 *   3. Vytvoří entitu `track_<primary-slug>-<title-slug>/`:
 *        meta.json      — title, description, publishedAt, deezer source
 *        relations.json — primaryArtist, featuring, belongsToAlbum, labels
 *        entity.mdx     — minimální kostra (doplní se později)
 *   4. Append-only: existující entity přeskočí.
 *
 * Bezpečnost: DRY_RUN=1 nic nezapíše. Zálohy nejsou potřeba (jen přidává).
 *
 * Použití:
 *   npx tsx scripts/generate-feat-tracks.ts            # dry-run report
 *   DRY_RUN=0 npx tsx scripts/generate-feat-tracks.ts  # zápis
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** slug z titulu: bez diakritiky, bez feat. části, bez parantéz. */
function slugify(s: string): string {
  return norm(s)
    .replace(/\s*[\(\[]?\s*(?:feat\.?|ft\.?|featuring|with)\s+.*$/i, "")
    .replace(/\s*[\(\[]\s*(?:live|remix|version|edit|mix)[^\)\]]*[\)\]]\s*$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

interface TracklistEntry {
  position: number;
  title: string;
  title_original?: string;
  duration_sec?: number;
  artists?: string[];
  feat?: string[];
  link?: string;
  isrc?: string;
  explicit?: boolean;
}

interface Candidate {
  id: string;
  slug: string;
  title: string;
  primaryArtistId: string;
  featuringIds: string[];
  albumId?: string;
  albumTitle?: string;
  labelId?: string;
  releaseDate?: string;
  duration?: number;
  explicit?: boolean;
  deezerUrl?: string;
  isrc?: string;
}

// ─── Indexy ───────────────────────────────────────────────────────────────

const artistByName = new Map<string, string>();   // normalized title → artist id
const artistSlugById = new Map<string, string>(); // artist id → slug
const albumBySlug = new Map<string, { id: string; title: string; labelId?: string }>();
const existingTrackSlugs = new Set<string>();
const existingTrackTitles = new Set<string>();    // normalized titles (pro dedup napříč slugy)

const dirs = fs.readdirSync(ENTITIES, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const d of dirs) {
  if (d.name.startsWith("artist_")) {
    const mp = path.join(ENTITIES, d.name, "meta.json");
    if (!fs.existsSync(mp)) continue;
    const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
    const slug = meta.slug ?? d.name.replace(/^artist_/, "");
    artistByName.set(norm(meta.title), meta.id);
    artistByName.set(norm(slug), meta.id);
    artistSlugById.set(meta.id, slug);
  } else if (d.name.startsWith("track_")) {
    const mp = path.join(ENTITIES, d.name, "meta.json");
    if (!fs.existsSync(mp)) continue;
    const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
    existingTrackSlugs.add(meta.slug ?? d.name.replace(/^track_/, ""));
    existingTrackTitles.add(norm(meta.title));
  } else if (d.name.startsWith("album_")) {
    const mp = path.join(ENTITIES, d.name, "meta.json");
    if (!fs.existsSync(mp)) continue;
    const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
    const slug = meta.slug ?? d.name.replace(/^album_/, "");
    // label z relations
    let labelId: string | undefined;
    const rp = path.join(ENTITIES, d.name, "relations.json");
    if (fs.existsSync(rp)) {
      const rel = JSON.parse(fs.readFileSync(rp, "utf8"));
      labelId = rel.labels?.[0] ?? rel.label?.[0];
    }
    albumBySlug.set(slug, { id: meta.id, title: meta.title, labelId });
  }
}

// ─── Sběr kandidátů ───────────────────────────────────────────────────────

const candidates: Candidate[] = [];
const seenSlugs = new Set<string>();
let skippedExisting = 0;
let skippedNoPrimary = 0;
const skippedDup = 0;

for (const d of dirs) {
  if (!d.name.startsWith("album_")) continue;
  const tp = path.join(ENTITIES, d.name, "tracks.json");
  if (!fs.existsSync(tp)) continue;
  const j = JSON.parse(fs.readFileSync(tp, "utf8"));

  const albumSlug = d.name.replace(/^album_/, "");
  const album = albumBySlug.get(albumSlug);

  for (const t of (j.tracks ?? []) as TracklistEntry[]) {
    if (!t.feat?.length) continue;

    const featIds = t.feat.map((f) => artistByName.get(norm(f))).filter((x): x is string => Boolean(x));
    if (!featIds.length) continue;

    const primaryId = (t.artists ?? [])
      .map((a) => artistByName.get(norm(a)))
      .find((x): x is string => Boolean(x));
    if (!primaryId) {
      skippedNoPrimary++;
      continue;
    }

    const primarySlug = artistSlugById.get(primaryId);
    if (!primarySlug) {
      skippedNoPrimary++;
      continue;
    }

    const titleSlug = slugify(t.title);
    if (!titleSlug) continue;
    const trackSlug = `${primarySlug}-${titleSlug}`;

    // dedup: stejný slug nebo stejný normalizovaný titul už existuje
    if (existingTrackSlugs.has(trackSlug) || seenSlugs.has(trackSlug)) {
      skippedExisting++;
      continue;
    }
    seenSlugs.add(trackSlug);

    const id = `track_${trackSlug}`;
    candidates.push({
      id,
      slug: trackSlug,
      title: t.title.replace(/\s*[\(\[]?\s*(?:feat\.?|ft\.?|featuring)\s+[^\)\]]*[\)\]]?\s*$/i, "").trim(),
      primaryArtistId: primaryId,
      featuringIds: [...new Set(featIds)],
      albumId: album?.id,
      albumTitle: album?.title,
      labelId: album?.labelId,
      releaseDate: j.release_date,
      duration: t.duration_sec,
      explicit: t.explicit,
      deezerUrl: t.link,
      isrc: t.isrc,
    });
  }
}

// ─── Report ───────────────────────────────────────────────────────────────

console.log(`Nalezeno kandidátů: ${candidates.length}`);
console.log(`Přeskočeno (existuje): ${skippedExisting}`);
console.log(`Přeskočeno (bez RKG primary): ${skippedNoPrimary}`);
console.log(`\nVzorek 12:`);
for (const c of candidates.slice(0, 12)) {
  const names = c.featuringIds.map((id) => artistSlugById.get(id)).join(", ");
  console.log(`  + track_${c.slug}  → feat: ${names}`);
}

if (DRY_RUN) {
  console.log(`\n[DRY-RUN] Nic nezapsáno. Spusť s DRY_RUN=0 pro zápis.`);
  process.exit(0);
}

// ─── Zápis ────────────────────────────────────────────────────────────────

let written = 0;
for (const c of candidates) {
  const dir = path.join(ENTITIES, c.id);
  if (fs.existsSync(dir)) continue;
  fs.mkdirSync(dir, { recursive: true });

  const description = c.albumTitle
    ? `Skladba „${c.title}" od ${artistSlugById.get(c.primaryArtistId)?.replace(/-/g, " ")} s hosty, z alba ${c.albumTitle}.`
    : `Skladba „${c.title}" se společnou účastí více interpretů.`;

  const meta = {
    id: c.id,
    type: "track",
    slug: c.slug,
    title: c.title,
    description,
    ...(c.releaseDate ? { publishedAt: c.releaseDate } : {}),
    extraMeta: {
      ...(c.duration ? { duration: c.duration } : {}),
      ...(c.explicit !== undefined ? { explicit: c.explicit } : {}),
      ...(c.isrc ? { isrc: c.isrc } : {}),
      ...(c.deezerUrl ? { sources: [c.deezerUrl] } : {}),
      generatedFrom: "deezer-tracklist",
    },
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  const relations: Record<string, string[]> = {
    primaryArtist: [c.primaryArtistId],
    featuring: c.featuringIds,
    belongsToAlbum: c.albumId ? [c.albumId] : [],
    producers: [],
    labels: c.labelId ? [c.labelId] : [],
    genres: [],
    styles: [],
    themes: [],
    moods: [],
    related: [],
  };
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2) + "\n");

  const mdx = `## O čem je\n\nSkladba „${c.title}" je společná nahrávka ${[c.primaryArtistId, ...c.featuringIds].length} interpretů.\n`;
  fs.writeFileSync(path.join(dir, "entity.mdx"), mdx);

  written++;
}

console.log(`\n✅ Zapsáno ${written} nových track entit.`);
console.log(`   Další krok: npm run cache:build`);
