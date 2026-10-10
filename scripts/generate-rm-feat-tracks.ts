#!/usr/bin/env -S npx tsx
/**
 * FÁZE 1 — Generátor track entit z Rap Monitor feat dat.
 *
 * Předpoklad: scripts/fetch-rap-monitor-feats.ts už stáhl snapshot.
 * Co dělá: pro RM skladby s feat (kde primary i feat jsou RKG artisti),
 * vytvoří entity `track_*`, pokud ještě neexistují.
 *
 * Idempotentní. DRY_RUN=0 pro zápis.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const SNAPSHOT = path.join(ROOT, ".data", "rap-monitor-feats.json");
const DRY_RUN = process.env.DRY_RUN !== "0";

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function slugify(s: string): string {
  return norm(s)
    .replace(/\s*[\(\[]?\s*(?:feat\.?|ft\.?|featuring|with)\s+.*$/i, "")
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

// ─── Indexy RKG ───────────────────────────────────────────────────────────
const artistByName = new Map<string, string>();
const artistSlugById = new Map<string, string>();
const existingSlugs = new Set<string>();

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
  }
}

// ─── Kandidáti z RM ───────────────────────────────────────────────────────
const snap = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
let scanned = 0, skippedExist = 0, skippedNoPrimary = 0;
const candidates: {
  id: string; slug: string; title: string;
  primaryArtistId: string; featuringIds: string[]; releaseDate?: string;
}[] = [];
const seen = new Set<string>();

for (const s of snap.songs) {
  if (!s.feats?.length) continue;
  scanned++;
  const primaryId = artistByName.get(norm(s.artist_name));
  if (!primaryId) { skippedNoPrimary++; continue; }
  const primarySlug = artistSlugById.get(primaryId);
  if (!primarySlug) { skippedNoPrimary++; continue; }
  const featIds = s.feats.map((f: string) => artistByName.get(norm(f))).filter(Boolean);
  if (!featIds.length) { skippedNoPrimary++; continue; }

  const titleSlug = slugify(s.title);
  if (!titleSlug) continue;
  const trackSlug = `${primarySlug}-${titleSlug}`;
  if (existingSlugs.has(trackSlug) || seen.has(trackSlug)) { skippedExist++; continue; }
  seen.add(trackSlug);

  candidates.push({
    id: `track_${trackSlug}`,
    slug: trackSlug,
    title: cleanTitle(s.title),
    primaryArtistId: primaryId,
    featuringIds: [...new Set<string>(featIds)],
    releaseDate: s.release_date ?? undefined,
  });
}

console.log(`RM skladeb s feat: ${scanned}`);
console.log(`Kandidátů: ${candidates.length}`);
console.log(`Přeskočeno (existuje): ${skippedExist}`);
console.log(`Přeskočeno (bez RKG primary/feat): ${skippedNoPrimary}`);
console.log("\nVzorek 10:");
for (const c of candidates.slice(0, 10)) {
  console.log(`  + track_${c.slug} → ${c.title} | feat: ${c.featuringIds.join(", ")}`);
}

if (DRY_RUN) {
  console.log("\n[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
  process.exit(0);
}

let written = 0;
for (const c of candidates) {
  const dir = path.join(ENTITIES, c.id);
  if (fs.existsSync(dir)) continue;
  fs.mkdirSync(dir, { recursive: true });
  const primaryName = c.primaryArtistId.replace(/^artist_/, "").replace(/-/g, " ");
  const meta = {
    id: c.id,
    type: "track",
    slug: c.slug,
    title: c.title,
    description: `Skladba „${c.title}" od ${primaryName} s hosty.`,
    ...(c.releaseDate ? { publishedAt: c.releaseDate } : {}),
    extraMeta: { generatedFrom: "rap-monitor" },
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  const relations = {
    primaryArtist: [c.primaryArtistId],
    featuring: c.featuringIds,
    belongsToAlbum: [],
    producers: [],
    labels: [],
    genres: [],
    styles: [],
    themes: [],
    moods: [],
    related: [],
  };
  fs.writeFileSync(path.join(dir, "relations.json"), JSON.stringify(relations, null, 2) + "\n");
  fs.writeFileSync(
    path.join(dir, "entity.mdx"),
    `## O čem je\n\nSkladba „${c.title}" se společnou účastí ${[c.primaryArtistId, ...c.featuringIds].length} interpretů.\n`,
  );
  written++;
}
console.log(`\n✅ Zapsáno ${written} nových track entit.`);
console.log(`   Další krok: npm run cache:build`);
