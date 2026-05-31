#!/usr/bin/env node
/**
 * normalize-tracks.mjs — KANONICKÉ parsování Deezer dat na entity projektu.
 *
 * Řeší rozjezd "Smack One"→smack, "P T K"→ptk, deluxe album slugy atd.
 * Resolduje přes Deezer artist ID (stabilní) → fallback jméno → fallback slug.
 *
 *   data/tracks/*.json :
 *     meta.primaryArtist  ← _deezer.raw.artist        (ID → mapa → jméno)
 *     meta.features[]     ← _deezer.raw.contributors  (kromě primárního)
 *     meta.album          ← _deezer.raw.album.title   (match na existující/normalizace)
 *   data/albums/*.json :
 *     meta.artist, meta.features  ← převedeny na kanonické slugy
 *
 * Persistentní mapa (ručně editovatelná): data/maps/deezer-artists.json
 *   { "byId": { "14437657": "smack" }, "unresolved": { "5026446": "Frank Flames" } }
 *   Nenapojené doplň ručně do byId a spusť znovu → deterministické.
 *
 *   node scripts/normalize-tracks.mjs            # report
 *   node scripts/normalize-tracks.mjs --write    # zapíše tracky, alba i mapu
 *
 * Po doběhnutí: node scripts/extract-edges.mjs
 * (Nahrazuje řešení features v enrich/derive — tohle je autoritativní.)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR = {
  tracks: path.join(ROOT, "data", "tracks"),
  rappers: path.join(ROOT, "data", "rappers"),
  albums: path.join(ROOT, "data", "albums"),
  maps: path.join(ROOT, "data", "maps"),
};
const MAP_FILE = path.join(DIR.maps, "deezer-artists.json");
const WRITE = process.argv.includes("--write");

const RAPPER_SLUGS = slugSet(DIR.rappers);
const ALBUM_SLUGS = slugSet(DIR.albums);
const ALIAS = buildAliasMap();           // slugify/despace klíč → kanonický slug
const MAP = loadMap();                    // { byId, unresolved }

let tracksChanged = 0, albumsChanged = 0, learned = 0;
const unresolved = new Map();             // id → name

main();

function main() {
  // ── TRACKY ──
  const tf = listJson(DIR.tracks);
  for (const f of tf) {
    const p = path.join(DIR.tracks, f);
    let t; try { t = JSON.parse(fs.readFileSync(p, "utf8")); } catch { console.log(`  ✖ vadný JSON: ${f}`); continue; }
    const r = t._deezer?.raw;
    if (!r) continue;
    t.meta = t.meta || {};
    let touched = false;

    // primaryArtist přes ID
    const a = r.artist || {};
    const primarySlug = resolveArtist(a.id, a.name) || resolveCanonicalSlug(t.meta.primaryArtist?.slug);
    if (primarySlug && t.meta.primaryArtist?.slug !== primarySlug) {
      t.meta.primaryArtist = { kind: "rapper", slug: primarySlug }; touched = true;
    }

    // features = ostatní contributoři
    const feats = [];
    for (const c of r.contributors || []) {
      if (c.id === a.id) continue;
      const s = resolveArtist(c.id, c.name) || slugify(c.name);
      feats.push({ kind: "rapper", slug: s });
    }
    const dedup = [...new Map(feats.map((x) => [x.slug, x])).values()];
    if (JSON.stringify(dedup) !== JSON.stringify(t.meta.features || [])) { t.meta.features = dedup; touched = true; }

    // album
    if (r.album?.title) {
      const al = matchAlbumSlug(r.album.title);
      if (t.meta.album?.slug !== al) { t.meta.album = { kind: "album", slug: al }; touched = true; }
    }

    if (touched) { tracksChanged++; if (WRITE) fs.writeFileSync(p, JSON.stringify(t, null, 2) + "\n", "utf8"); }
  }

  // ── ALBA (oprav meta.artist / meta.features na kanonické slugy) ──
  for (const f of listJson(DIR.albums)) {
    const p = path.join(DIR.albums, f);
    let al; try { al = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
    if (!al.meta) continue;
    let touched = false;
    if (al.meta.artist?.slug) {
      const c = resolveCanonicalSlug(al.meta.artist.slug);
      if (c && c !== al.meta.artist.slug) { al.meta.artist.slug = c; touched = true; }
    }
    if (Array.isArray(al.meta.features)) {
      const fixed = al.meta.features.map((x) => ({ kind: "rapper", slug: resolveCanonicalSlug(x.slug) || x.slug }));
      if (JSON.stringify(fixed) !== JSON.stringify(al.meta.features)) { al.meta.features = fixed; touched = true; }
    }
    if (touched) { albumsChanged++; if (WRITE) fs.writeFileSync(p, JSON.stringify(al, null, 2) + "\n", "utf8"); }
  }

  // ── mapa: doplň nevyřešené ──
  MAP.unresolved = MAP.unresolved || {};
  for (const [id, name] of unresolved) if (!MAP.byId[id]) MAP.unresolved[id] = name;
  if (WRITE) { fs.mkdirSync(DIR.maps, { recursive: true }); fs.writeFileSync(MAP_FILE, JSON.stringify(MAP, null, 2) + "\n", "utf8"); }

  // ── report ──
  console.log(`Tracků změněno: ${tracksChanged}, alb změněno: ${albumsChanged}, naučeno ID→slug: ${learned}`);
  if (unresolved.size) {
    console.log(`\n⚠ Nenapojení umělci (${unresolved.size}) — doplň slug do data/maps/deezer-artists.json → byId:`);
    [...unresolved.entries()].slice(0, 50).forEach(([id, name]) => console.log(`    "${id}": ""   // ${name}  (guess: ${slugify(name)})`));
  }
  console.log(WRITE ? `\n✓ Zapsáno. Další krok: node scripts/extract-edges.mjs` : `\nNic nezapsáno. Spusť s --write.`);
}

// ── resolvery ──
function resolveArtist(id, name) {
  if (id != null && MAP.byId[String(id)]) return MAP.byId[String(id)];
  const byName = resolveByName(name);
  if (byName) { if (id != null) { MAP.byId[String(id)] = byName; learned++; } return byName; }
  if (id != null && name) unresolved.set(String(id), name);
  return null;
}
function resolveByName(name) {
  if (!name) return null;
  const s = slugify(name);
  if (RAPPER_SLUGS.has(s)) return s;
  if (ALIAS.has(s)) return ALIAS.get(s);
  const d = despace(name);
  if (ALIAS.has(d)) return ALIAS.get(d);
  return null;
}
function resolveCanonicalSlug(slug) {
  if (!slug) return null;
  if (RAPPER_SLUGS.has(slug)) return slug;
  if (ALIAS.has(slug)) return ALIAS.get(slug);
  const d = despace(slug.replace(/-/g, " "));
  if (ALIAS.has(d)) return ALIAS.get(d);
  return null;
}
function matchAlbumSlug(title) {
  const exact = slugify(title);
  if (ALBUM_SLUGS.has(exact)) return exact;
  const norm = slugify(normalizeAlbumTitle(title));
  if (ALBUM_SLUGS.has(norm)) return norm;
  let best = null;
  for (const s of ALBUM_SLUGS) if (norm === s || norm.startsWith(s + "-")) if (!best || s.length > best.length) best = s;
  return best || norm;
}

// ── indexy ──
function buildAliasMap() {
  const map = new Map();
  const put = (k, slug) => { if (k && !map.has(k)) map.set(k, slug); };
  if (fs.existsSync(DIR.rappers)) for (const f of listJson(DIR.rappers)) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(DIR.rappers, f), "utf8")); } catch { continue; }
    const slug = j.slug || f.replace(/\.json$/, "");
    for (const v of [slug, j.title, j.name, j.meta?.realName, ...(j.aliases || [])]) {
      if (!v) continue; put(slugify(v), slug); put(despace(v), slug);
    }
  }
  return map;
}
function loadMap() {
  if (fs.existsSync(MAP_FILE)) { try { const m = JSON.parse(fs.readFileSync(MAP_FILE, "utf8")); m.byId = m.byId || {}; return m; } catch {} }
  return { byId: {}, unresolved: {} };
}

// ── helpers ──
function listJson(dir) { try { return fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")); } catch { return []; } }
function slugSet(dir) { return new Set(listJson(dir).map((f) => f.replace(/\.json$/, ""))); }
function slugify(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function despace(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function normalizeAlbumTitle(t) {
  return String(t)
    .replace(/\s*[\(\[][^\)\]]*?(edition|edice|deluxe|reedice|remaster|version|anniversary)[^\)\]]*[\)\]]/ig, "")
    .replace(/\s*[-–—:]\s*(deluxe|reedice|remaster|anniversary)\b.*$/i, "").trim();
}
