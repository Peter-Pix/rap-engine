#!/usr/bin/env -S npx tsx
/**
 * Audit: kolik feat. dat leží v Deezer tracklistech a jak je napojit na entity.
 *
 * Čte content/entities/album_*\/tracks.json (Deezer tracklisty), matchuje
 * jednotlivé skladby na entity `track_*` (přes deezer track ID v sources),
 * a reportuje:
 *   - kolik tracklist skladeb má feat
 *   - kolik feat jmen matchuje RKG artisty
 *   - kolik by šlo zapsat do relations.json
 *
 * Dry-run, nic nezapisuje.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

interface TracklistEntry {
  title: string;
  artists?: string[];
  feat?: string[];
  link?: string;
}

// 1) index RKG artistů: normalized name → id
const artistByName = new Map<string, string>();
// 2) deezer track id → entity track id (z entit)
const deezerIdToTrack = new Map<string, string>();

const dirs = fs.readdirSync(ENTITIES, { withFileTypes: true }).filter((d) => d.isDirectory());

for (const d of dirs) {
  if (d.name.startsWith("artist_")) {
    const mp = path.join(ENTITIES, d.name, "meta.json");
    if (!fs.existsSync(mp)) continue;
    const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
    artistByName.set(norm(meta.title), meta.id);
    // i slug (bez diakritiky "7krat3" vs "7krát3")
    const slugClean = norm(d.name.replace(/^artist_/, ""));
    if (!artistByName.has(slugClean)) artistByName.set(slugClean, meta.id);
  } else if (d.name.startsWith("track_")) {
    const mp = path.join(ENTITIES, d.name, "meta.json");
    if (!fs.existsSync(mp)) continue;
    const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
    const sources: string[] = meta.extraMeta?.sources ?? [];
    for (const s of sources) {
      const m = s.match(/deezer\.com\/track\/(\d+)/);
      if (m) deezerIdToTrack.set(m[1], meta.id);
    }
  }
}

console.log(`RKG artistů v indexu: ${artistByName.size}`);
console.log(`Track entit s deezer ID: ${deezerIdToTrack.size}\n`);

// 3) projdi tracklisty
let albumsScanned = 0;
let entriesTotal = 0;
let entriesWithFeat = 0;
let featLinks = 0;
let matchedToTrack = 0;
let featMatchedRkg = 0;
let featForeign = 0;
const foreignNames = new Set<string>();
const pending: { trackId: string; featIds: string[] }[] = [];

for (const d of dirs) {
  if (!d.name.startsWith("album_")) continue;
  const tp = path.join(ENTITIES, d.name, "tracks.json");
  if (!fs.existsSync(tp)) continue;
  albumsScanned++;
  const j = JSON.parse(fs.readFileSync(tp, "utf8"));
  for (const t of (j.tracks ?? []) as TracklistEntry[]) {
    entriesTotal++;
    const deezerId = (t.link ?? "").match(/deezer\.com\/track\/(\d+)/)?.[1];
    const trackId = deezerId ? deezerIdToTrack.get(deezerId) : undefined;
    if (trackId) matchedToTrack++;
    if (!t.feat?.length) continue;
    entriesWithFeat++;
    featLinks += t.feat.length;
    const featIds: string[] = [];
    for (const f of t.feat) {
      const id = artistByName.get(norm(f));
      if (id) {
        featMatchedRkg++;
        featIds.push(id);
      } else {
        featForeign++;
        foreignNames.add(f);
      }
    }
    if (trackId && featIds.length) pending.push({ trackId, featIds });
  }
}

console.log(`── Deezer tracklisty ─────────────────`);
console.log(`alb se tracklistem:      ${albumsScanned}`);
console.log(`skladeb celkem:          ${entriesTotal}`);
console.log(`skladeb s feat:          ${entriesWithFeat}`);
console.log(`feat vazeb:              ${featLinks}`);
console.log(`spárováno na entitu:     ${matchedToTrack} (${((matchedToTrack / entriesTotal) * 100).toFixed(1)} %)`);
console.log(`\n── Feat jména ────────────`);
console.log(`match RKG:               ${featMatchedRkg}`);
console.log(`mimo RKG (zahraničí/…):  ${featForeign} (${foreignNames.size} unikátních)`);
console.log(`\n── K zápisu ──────────────`);
console.log(`track entit s novými feat: ${pending.length}`);
console.log(`celkem nových vazeb:      ${pending.reduce((a, p) => a + p.featIds.length, 0)}`);
