#!/usr/bin/env node
/**
 * derive-entities.mjs — z uložených _deezer.raw v data/tracks/*.json:
 *   1) dogeneruje chybějící alba (data/albums/<slug>.json) → konec orphan PART_OF_ALBUM
 *   2) opraví track.meta.features tak, aby ukazovaly na EXISTUJÍCÍ rapery
 *      (resolver: slug → bez mezer → alias/realName).  "P T K" → "ptk"
 *   3) sjednotí track.meta.album na existující/nový album slug
 *
 *   node scripts/derive-entities.mjs              # report (nic nezapíše)
 *   node scripts/derive-entities.mjs --write      # zapíše alba + opraví tracky
 *   node scripts/derive-entities.mjs --write --fetch   # alba obohatí přes /album/{id} (žánry, umělec)
 *
 * Po doběhnutí: node scripts/extract-edges.mjs
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
};
const WRITE = process.argv.includes("--write");
const FETCH = process.argv.includes("--fetch");

// ── indexy existujících entit ──
const ALBUM_SLUGS = slugSet(DIR.albums);
const { rapperSlugs: RAPPER_SLUGS, aliasMap: RAPPER_ALIAS } = buildRapperIndex();

const albumsToCreate = new Map();      // slug -> data
const unresolved = new Map();          // name -> count
let tracksChanged = 0, albumsCreated = 0;

main().catch((e) => { console.error("✖", e.message); process.exit(1); });

async function main() {
  const files = fs.existsSync(DIR.tracks)
    ? fs.readdirSync(DIR.tracks).filter((f) => f.endsWith(".json") && !f.startsWith("_")) : [];
  console.log(`Tracků: ${files.length}  (rapperů ${RAPPER_SLUGS.size}, alb ${ALBUM_SLUGS.size})\n`);

  for (const f of files) {
    const p = path.join(DIR.tracks, f);
    let t; try { t = JSON.parse(fs.readFileSync(p, "utf8")); } catch { console.log(`  ✖ vadný JSON: ${f}`); continue; }
    const r = t._deezer?.raw;
    if (!r) continue;
    t.meta = t.meta || {};
    const primary = t.meta.primaryArtist?.slug;
    let touched = false;

    // ── FEATURES: resolve na existující rapery ──
    const feats = [];
    for (const c of r.contributors || []) {
      const guess = slugify(c.name);
      if (guess === primary) continue;
      const resolved = resolveRapper(c.name);
      if (!resolved) unresolved.set(c.name, (unresolved.get(c.name) || 0) + 1);
      feats.push({ kind: "rapper", slug: resolved || guess });
    }
    const featsDedup = [...new Map(feats.map((x) => [x.slug, x])).values()];
    if (JSON.stringify(featsDedup) !== JSON.stringify(t.meta.features || [])) {
      t.meta.features = featsDedup; touched = true;
    }

    // ── ALBUM: resolve / naplánuj stub ──
    if (r.album?.title) {
      const albumSlug = matchAlbumSlug(r.album.title);
      if (t.meta.album?.slug !== albumSlug) { t.meta.album = { kind: "album", slug: albumSlug }; touched = true; }
      if (!ALBUM_SLUGS.has(albumSlug) && !albumsToCreate.has(albumSlug)) {
        albumsToCreate.set(albumSlug, {
          slug: albumSlug,
          title: r.album.title,
          year: yearOf(r.album.release_date) || t.meta.year || null,
          cover: r.album.cover_xl || r.album.cover_big || null,
          deezerAlbumId: r.album.id,
          artist: t.meta.primaryArtist || null,
        });
      }
    }

    if (touched) { tracksChanged++; if (WRITE) fs.writeFileSync(p, JSON.stringify(t, null, 2) + "\n", "utf8"); }
  }

  // ── vytvoř chybějící alba ──
  for (const [slug, d] of albumsToCreate) {
    let extra = {};
    if (FETCH && d.deezerAlbumId) extra = await fetchAlbum(d.deezerAlbumId);
    const album = buildAlbumStub(d, extra);
    albumsCreated++;
    if (WRITE) {
      fs.mkdirSync(DIR.albums, { recursive: true });
      fs.writeFileSync(path.join(DIR.albums, `${slug}.json`), JSON.stringify(album, null, 2) + "\n", "utf8");
    }
  }

  // ── report ──
  console.log(`${WRITE ? "" : "[report] "}Alba k vytvoření: ${albumsCreated}`);
  if (albumsToCreate.size) for (const [s, d] of albumsToCreate) console.log(`  + ${s}  (${d.title}, ${d.year ?? "?"}) artist=${d.artist?.slug ?? "?"}`);
  console.log(`\nTracků s opravou (features/album): ${tracksChanged}`);
  if (unresolved.size) {
    console.log(`\n⚠ Nenapojení featuři (${unresolved.size} jmen) — buď přidej rapera, nebo alias do existujícího:`);
    [...unresolved.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
      .forEach(([name, n]) => console.log(`    ${name}  →  guess "${slugify(name)}"  (${n}×)`));
  }
  if (!WRITE) console.log(`\nNic nezapsáno. Spusť s --write.`);
  else console.log(`\n✓ Zapsáno. Další krok: node scripts/extract-edges.mjs`);
}

// ── album stub (wrapper jako u tracků; meta dle extract-edges) ──
function buildAlbumStub(d, extra) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `album_${d.slug}`,
    kind: "album",
    slug: d.slug,
    title: d.title,
    aliases: [],
    summary: "",
    status: "stub",
    createdAt: today,
    updatedAt: today,
    meta: {
      artist: d.artist || null,          // CREATED čte album.meta.artist
      label: null,                       // RELEASED_ON — doplnit ručně
      year: extra.year ?? d.year ?? null,
      genres: extra.genres || [],        // jen s --fetch
      features: [],
      cover: d.cover,
      deezerAlbumId: d.deezerAlbumId,
    },
    significance: { why: "", whatChanged: "", context: "", distinguishing: "", oneLiner: "" },
    timeline: [],
    quotes: [],
    faq: [],
    hasLongform: false,
    seo: { noindex: true },
  };
}

async function fetchAlbum(id) {
  try {
    const r = await fetch(`https://api.deezer.com/album/${id}`);
    if (!r.ok) return {};
    const a = await r.json();
    return {
      year: yearOf(a.release_date),
      genres: (a.genres?.data || []).map((g) => ({ kind: "genre", slug: slugify(g.name) })),
    };
  } catch { return {}; }
}

// ── resolvery ──
function resolveRapper(name) {
  const s = slugify(name);
  if (RAPPER_SLUGS.has(s)) return s;
  const d = despace(name);
  if (RAPPER_ALIAS.has(d)) return RAPPER_ALIAS.get(d);
  if (RAPPER_ALIAS.has(s)) return RAPPER_ALIAS.get(s);
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
function buildRapperIndex() {
  const rapperSlugs = slugSet(DIR.rappers);
  const aliasMap = new Map();
  const put = (k, slug) => { if (k && !aliasMap.has(k)) aliasMap.set(k, slug); };
  if (fs.existsSync(DIR.rappers)) {
    for (const f of fs.readdirSync(DIR.rappers).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
      let j; try { j = JSON.parse(fs.readFileSync(path.join(DIR.rappers, f), "utf8")); } catch { continue; }
      const slug = j.slug || f.replace(/\.json$/, "");
      for (const v of [slug, j.title, j.meta?.realName, ...(j.aliases || [])]) {
        if (!v) continue; put(slugify(v), slug); put(despace(v), slug);
      }
    }
  }
  return { rapperSlugs, aliasMap };
}

// ── helpers ──
function slugSet(dir) {
  try { return new Set(fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => f.replace(/\.json$/, ""))); }
  catch { return new Set(); }
}
function slugify(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function despace(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function normalizeAlbumTitle(t) {
  return String(t)
    .replace(/\s*[\(\[][^\)\]]*?(edition|edice|deluxe|reedice|remaster|version|anniversary)[^\)\]]*[\)\]]/ig, "")
    .replace(/\s*[-–—:]\s*(deluxe|reedice|remaster|anniversary)\b.*$/i, "").trim();
}
function yearOf(date) { const y = parseInt(String(date || "").slice(0, 4), 10); return Number.isFinite(y) && y > 1900 ? y : null; }
