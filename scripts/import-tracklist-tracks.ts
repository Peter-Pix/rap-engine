#!/usr/bin/env -S npx tsx
/**
 * FÁZE 4 — Import skladeb z Deezer tracklistů (rozšíření DB).
 *
 * Tracklisty (529 alb, 6068 skladeb) obsahují skladby, které v DB nejsou
 * jako entity. Bez nich je „společné skladby" neúplné (rapper s 50 tracky
 * má v DB 3).
 *
 * IMPORTANT: Nové entity jsou bez obsahu (jen title/duration/isrc/artist/album).
 * Nastavujeme `noindex: true` + `isStub: true` → Google je neindexuje
 * (sitemap bere jen AUTHORITATIVE, metadata dají robots: noindex).
 * Až dostanou popis (fáze 3), flag se sundá.
 *
 * Bezpečnost: DRY_RUN default, idempotentní, dedup přes slug.
 *
 * Použití:
 *   npx tsx scripts/import-tracklist-tracks.ts             # dry-run
 *   DRY_RUN=0 npx tsx scripts/import-tracklist-tracks.ts   # zápis
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function slugify(s: string): string {
  return norm(s)
    .replace(/\s*[\(\[]?\s*(?:feat\.?|ft\.?|featuring|with)\s+.*$/i, "")
    .replace(/\s*[\(\[]\s*(?:live|remix|version|edit|mix|remaster)[^\)\]]*[\)\]]\s*$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function cleanTitle(s: string): string {
  return s
    .replace(/\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+[^\)\]]*[\)\]]/i, "")
    .replace(/\s+(?:feat\.?|ft\.?|featuring|with)\s+.+$/i, "")
    .trim();
}

// ─── Indexy ───────────────────────────────────────────────────────────────
const artistByName = new Map<string, string>();
const artistSlugById = new Map<string, string>();
const albumBySlug = new Map<string, { id: string; labelId?: string }>();
const existingSlugs = new Set<string>();
const existingTitles = new Set<string>();

for (const d of fs.readdirSync(ENTITIES, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const mp = path.join(ENTITIES, d.name, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
  if (d.name.startsWith("artist_")) {
    artistByName.set(norm(meta.title), meta.id);
    artistByName.set(norm(meta.slug ?? ""), meta.id);
    artistSlugById.set(meta.id, meta.slug ?? d.name.replace(/^artist_/, ""));
  } else if (d.name.startsWith("track_")) {
    existingSlugs.add(meta.slug ?? d.name.replace(/^track_/, ""));
    existingTitles.add(norm(meta.title));
  } else if (d.name.startsWith("album_")) {
    let labelId: string | undefined;
    const rp = path.join(ENTITIES, d.name, "relations.json");
    if (fs.existsSync(rp)) {
      const rel = JSON.parse(fs.readFileSync(rp, "utf8"));
      labelId = rel.labels?.[0];
    }
    albumBySlug.set(d.name.replace(/^album_/, ""), { id: meta.id, labelId });
  }
}

// ─── Kandidáti ────────────────────────────────────────────────────────────
interface Cand {
  id: string; slug: string; title: string;
  primaryId: string; featIds: string[];
  albumId?: string; labelId?: string;
  duration?: number; isrc?: string; explicit?: boolean;
  deezerUrl?: string; releaseDate?: string;
}
const cands: Cand[] = [];
const seen = new Set<string>();
let scanned = 0, skipped = 0, noArtist = 0;

for (const d of fs.readdirSync(ENTITIES, { withFileTypes: true })) {
  if (!d.isDirectory() || !d.name.startsWith("album_")) continue;
  const tp = path.join(ENTITIES, d.name, "tracks.json");
  if (!fs.existsSync(tp)) continue;
  const j = JSON.parse(fs.readFileSync(tp, "utf8"));
  const albumSlug = d.name.replace(/^album_/, "");
  const album = albumBySlug.get(albumSlug);

  for (const t of j.tracks ?? []) {
    scanned++;
    const primaryId = (t.artists ?? []).map((a: string) => artistByName.get(norm(a))).find(Boolean);
    if (!primaryId) { noArtist++; continue; }
    const primarySlug = artistSlugById.get(primaryId);
    if (!primarySlug) { noArtist++; continue; }

    const titleSlug = slugify(t.title);
    if (!titleSlug) continue;
    const trackSlug = `${primarySlug}-${titleSlug}`;

    // Dedup: existující slug nebo existující titul (napříč slugy)
    if (existingSlugs.has(trackSlug) || seen.has(trackSlug)) { skipped++; continue; }
    if (existingTitles.has(norm(t.title))) { skipped++; continue; }
    seen.add(trackSlug);

    const featIds = (t.feat ?? []).map((f: string) => artistByName.get(norm(f))).filter(Boolean);
    cands.push({
      id: `track_${trackSlug}`,
      slug: trackSlug,
      title: cleanTitle(t.title),
      primaryId,
      featIds: [...new Set<string>(featIds)],
      albumId: album?.id,
      labelId: album?.labelId,
      duration: t.duration_sec,
      isrc: t.isrc,
      explicit: t.explicit,
      deezerUrl: t.link,
      releaseDate: j.release_date,
    });
  }
}

console.log(`Proskenováno skladeb: ${scanned}`);
console.log(`Kandidátů k importu: ${cands.length}`);
console.log(`Přeskočeno (existuje): ${skipped}`);
console.log(`Bez RKG primary: ${noArtist}`);
console.log(`\nVzorek 8:`);
for (const c of cands.slice(0, 8)) {
  console.log(`  + track_${c.slug} → ${c.title}${c.featIds.length ? " | feat: " + c.featIds.join(", ") : ""}`);
}

if (DRY_RUN) {
  console.log("\n[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
  process.exit(0);
}

let written = 0;
for (const c of cands) {
  const dir = path.join(ENTITIES, c.id);
  if (fs.existsSync(dir)) continue;
  fs.mkdirSync(dir, { recursive: true });

  const primaryName = c.primaryId.replace(/^artist_/, "").replace(/-/g, " ");
  const meta = {
    id: c.id,
    type: "track",
    slug: c.slug,
    title: c.title,
    description: `Skladba „${c.title}" od ${primaryName}.`,
    ...(c.releaseDate ? { publishedAt: c.releaseDate } : {}),
    extraMeta: {
      ...(c.duration ? { duration: c.duration } : {}),
      ...(c.explicit !== undefined ? { explicit: c.explicit } : {}),
      ...(c.isrc ? { isrc: c.isrc } : {}),
      ...(c.deezerUrl ? { sources: [c.deezerUrl] } : {}),
      generatedFrom: "deezer-tracklist",
      // Bez obsahu → neindexovat, dokud nedostane popis (fáze 3).
      noindex: true,
      isStub: true,
    },
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  const relations: Record<string, string[]> = {
    primaryArtist: [c.primaryId],
    featuring: c.featIds,
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

  const mdx = `## O čem je\n\nBez popisu — doplní se.\n`;
  fs.writeFileSync(path.join(dir, "entity.mdx"), mdx);
  written++;
}

console.log(`\n✅ Importováno ${written} skladeb (noindex, dokud nedostanou obsah).`);
console.log(`   Další krok: npm run cache:build`);
