#!/usr/bin/env node
/**
 * deezer.mjs — SJEDNOCENÝ Deezer fetcher & saver pro 4rap rap-engine
 *
 *   node scripts/deezer.mjs search "yzomandias"              # vyhledá (interaktivní výběr)
 *   node scripts/deezer.mjs search "noir yzomandias" --type track
 *
 *   node scripts/deezer.mjs track 3087922611 12345           # uloží jednu nebo více skladeb
 *   node scripts/deezer.mjs album https://www.deezer.com/cs/album/911158401 108473    # alba + skladby
 *   node scripts/deezer.mjs artist 10525251 4050202          # rapper entity (více ID)
 *   node scripts/deezer.mjs artist 10525251 --pull-albums    # rapper + všechna alba + skladby
 *
 *   flagy: --dry-run --force --no-mdx --no-tracks --limit-albums N --limit-tracks N
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const D = (p) => path.join(ROOT, p);
const DIR = {
  tracks: "data/tracks", albums: "data/albums", rappers: "data/rappers",
  labels: "data/labels", genres: "data/genres", maps: "data/maps",
  mdxTracks: "content/skladby", mdxAlbums: "content/alba", mdxRappers: "content/raperi",
};
const MAP_FILE = D(path.join(DIR.maps, "deezer-artists.json"));
const TODAY = new Date().toISOString().slice(0, 10);

// ──────────────── ARGUMENT PARSING ────────────────
const argv = process.argv.slice(2);
const cmd = argv.shift() || null;
const operands = [];
const FLAGS = {
  dryRun: false, force: false, noMdx: false, noTracks: false, pullAlbums: false,
  type: null, limitAlbums: 999, limitTracks: 9999,
};

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dry-run") FLAGS.dryRun = true;
  else if (a === "--force") FLAGS.force = true;
  else if (a === "--no-mdx") FLAGS.noMdx = true;
  else if (a === "--no-tracks") FLAGS.noTracks = true;
  else if (a === "--pull-albums") FLAGS.pullAlbums = true;
  else if (a === "--type" && argv[i + 1]) { FLAGS.type = argv[++i]; }
  else if (a === "--limit-albums" && argv[i + 1]) { FLAGS.limitAlbums = parseInt(argv[++i], 10); }
  else if (a === "--limit-tracks" && argv[i + 1]) { FLAGS.limitTracks = parseInt(argv[++i], 10); }
  else operands.push(a);
}

const NAME = { rapper: nameIndex(DIR.rappers), album: nameIndex(DIR.albums), label: nameIndex(DIR.labels) };
const RAPPER_SLUGS = new Set(Object.keys(NAME.rapper));
const ALBUM_SLUGS = new Set(Object.keys(NAME.album));
const LABEL_SLUGS = new Set(Object.keys(NAME.label));
const GENRE_SLUGS = new Set(listJson(D(DIR.genres)).map((f) => f.replace(/\.json$/, "")));
const ALIAS = buildAliasMap();
const MAP = loadMap();

main().catch((e) => { console.error("\n✖", e.message); process.exit(1); });

async function main() {
  if (!cmd) return printHelp();
  if (cmd === "search") return runSearch(operands.join(" "));
  if (cmd === "track") return runBatch(operands, processTrack);
  if (cmd === "album") return runBatch(operands, processAlbum);
  if (cmd === "artist") return runBatch(operands, processArtist);
  printHelp();
}

// ──────────────── BATCH PROCESSING ────────────────
async function runBatch(ids, processorFn) {
  if (!ids.length) return console.log("Zadej alespoň jedno Deezer ID nebo URL.");
  for (const id of ids) {
    try {
      await processorFn(id);
    } catch (e) {
      console.error(`\n✖ Chyba při zpracování ${id}: ${e.message}`);
    }
    if (ids.indexOf(id) < ids.length - 1) await sleep(350);
  }
}

// ──────────────── SEARCH ────────────────
async function runSearch(query) {
  if (!query) return console.log("Zadej dotaz: deezer.mjs search \"yzomandias\" [--type track|album|artist]");
  const type = FLAGS.type || "track";
  const url = type === "artist" ? `search/artist` : type === "album" ? `search/album` : `search/track`;
  const r = await dz(`${url}?q=${encodeURIComponent(query)}&limit=10`);
  const items = r.data || [];
  if (!items.length) return console.log("Nic nenalezeno.");

  console.log(`Top ${items.length} ${type}:`);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (type === "artist") console.log(`  [${i + 1}] id ${it.id}  ${it.name}  (${it.nb_fan} fans)`);
    else if (type === "album") console.log(`  [${i + 1}] id ${it.id}  "${it.title}" — ${it.artist?.name}  (${it.nb_tracks} skl.)`);
    else console.log(`  [${i + 1}] id ${it.id}  "${it.title}" — ${it.artist?.name}  [album: ${it.album?.title}]`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nVyber položky k uložení (např. 1,3-5) nebo Enter pro přeskočení: `);
  rl.close();

  const selectedIndices = parseSelection(answer, items.length);
  for (const idx of selectedIndices) {
    const it = items[idx - 1];
    console.log(`\n→ Zpracovávám výběr [${idx}]: ${it.name || it.title}`);
    if (type === "artist") await processArtist(String(it.id));
    else if (type === "album") await processAlbum(String(it.id));
    else await processTrack(String(it.id));
    await sleep(300);
  }
}

function parseSelection(input, max) {
  const selected = new Set();
  if (!input) return [];
  input.split(",").forEach((part) => {
    part = part.trim();
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= Math.min(end, max); i++) if (i > 0) selected.add(i);
    } else {
      const num = parseInt(part, 10);
      if (num > 0 && num <= max) selected.add(num);
    }
  });
  return [...selected].sort((a, b) => a - b);
}

// ──────────────── TRACK ────────────────
async function processTrack(idOrUrl) {
  const id = parseDeezerId(idOrUrl);
  if (!id) return console.log(`⚠ Nelze parsovat track ID: ${idOrUrl}`);
  const t = await dz(`track/${id}`);
  if (t.error) throw new Error(`Deezer: ${t.error.message}`);
  await saveTrack(t);
}

async function saveTrack(t, ctx = {}) {
  const primaryName = t.contributors?.find((c) => c.role === "Main")?.name || t.artist?.name || "";
  const primaryId = t.artist?.id;
  const primarySlug = ctx.primaryArtistSlug || resolveArtist(primaryId, primaryName) || slugify(primaryName);

  const title = cleanTitle(t.title);
  const slug = `${slugify(title)}-${primarySlug}`;

  const features = (t.contributors || [])
    .filter((c) => c.id !== primaryId && resolveArtist(c.id, c.name) !== primarySlug)
    .map((c) => ({ name: c.name, slug: resolveArtist(c.id, c.name) || slugify(c.name) }));
  const featDedup = [...new Map(features.map((x) => [x.slug, x])).values()];

  const albumSlug = ctx.albumSlug || (t.album?.title ? matchAlbumSlug(t.album.title) : null);
  const year = yearOf(t.release_date || t.album?.release_date);

  const trackJson = {
    id: `track_${slug}`, kind: "track", slug, title, aliases: [], summary: "",
    status: "stub", createdAt: TODAY, updatedAt: TODAY,
    meta: {
      primaryArtist: { kind: "rapper", slug: primarySlug },
      features: featDedup.map((f) => ({ kind: "rapper", slug: f.slug })),
      album: albumSlug ? { kind: "album", slug: albumSlug } : null,
      producers: [], year, duration: t.duration ? fmtDur(t.duration) : null,
      trackNumber: t.track_position ?? ctx.trackNumber ?? null,
      genres: [], deezerId: t.id, isrc: t.isrc || null, rank: t.rank || null,
      explicit: !!t.explicit_lyrics, cover: t.album?.cover_xl || t.album?.cover_big || null,
      previewUrl: t.preview || null, bpm: t.bpm && t.bpm > 0 ? Math.round(t.bpm) : null,
    },
    significance: emptySig(), timeline: [], quotes: [], faq: [],
    hasLongform: false, seo: { noindex: true },
    _deezer: { fetchedAt: new Date().toISOString(), source: `https://api.deezer.com/track/${t.id}`, raw: t },
  };

  const trackMdx = `---\n${yaml({
    title, slug,
    rapper: NAME.rapper[primarySlug] || primaryName || primarySlug,
    rapperSlug: primarySlug,
    features: featDedup.map((f) => f.slug),
    featuresNames: featDedup.map((f) => f.name),
    album: albumSlug ? (NAME.album[albumSlug] || ctx.albumTitle || t.album?.title) : undefined,
    albumSlug: albumSlug || undefined,
    year: year ?? undefined, genre: [],
    duration: t.duration ? fmtDur(t.duration) : undefined,
    trackNumber: t.track_position ?? ctx.trackNumber ?? undefined,
    producers: [], producersNames: [],
    description: `${title} — skladba od ${NAME.rapper[primarySlug] || primaryName}.`,
    publishedAt: TODAY,
  })}\n---\n\n## Kontext\n\n_Stub — doplnit._\n`;

  writeEntity({
    label: "track", slug,
    jsonPath: D(path.join(DIR.tracks, `${slug}.json`)), json: trackJson,
    mdxPath: D(path.join(DIR.mdxTracks, `${slug}.mdx`)), mdx: trackMdx,
    warn: warnRefs(primarySlug, RAPPER_SLUGS, "primaryArtist", featDedup.map((f) => f.slug)),
  });
}

// ──────────────── ALBUM ────────────────
async function processAlbum(idOrUrl) {
  const id = parseDeezerId(idOrUrl);
  if (!id) return console.log(`⚠ Nelze parsovat album ID: ${idOrUrl}`);
  const a = await dz(`album/${id}`);
  if (a.error) throw new Error(`Deezer: ${a.error.message}`);
  await saveAlbum(a);

  if (!FLAGS.noTracks) {
    const tracks = (a.tracks?.data || []).slice(0, FLAGS.limitTracks);
    const artistSlug = resolveArtist(a.artist?.id, a.artist?.name) || slugify(a.artist?.name || "");
    const albumSlug = matchAlbumSlug(a.title);
    console.log(`  → ${tracks.length} skladeb`);
    for (let i = 0; i < tracks.length; i++) {
      const full = await dz(`track/${tracks[i].id}`);
      await sleep(280);
      await saveTrack(full, { primaryArtistSlug: artistSlug, albumSlug, albumTitle: a.title, trackNumber: i + 1 });
    }
  }
}

async function saveAlbum(a) {
  const artistSlug = resolveArtist(a.artist?.id, a.artist?.name) || slugify(a.artist?.name || "");
  const labelSlug = a.label && LABEL_SLUGS.has(slugify(a.label)) ? slugify(a.label) : null;
  const genres = (a.genres?.data || []).map((g) => slugify(g.name)).filter((s) => GENRE_SLUGS.has(s));
  const slug = matchAlbumSlug(a.title);
  const year = yearOf(a.release_date);
  const trackTitles = (a.tracks?.data || []).map((t) => t.title);

  const albumJson = {
    id: `album_${slug}`, kind: "album", slug, title: a.title, aliases: [], summary: "",
    image: a.cover_xl || a.cover_big || null,
    status: "stub", createdAt: TODAY, updatedAt: TODAY,
    meta: {
      artist: artistSlug ? { kind: "rapper", slug: artistSlug } : null,
      features: [],
      label: labelSlug ? { kind: "label", slug: labelSlug } : null,
      labelName: a.label || null,
      year, type: recordType(a.record_type),
      genres: genres.map((s) => ({ kind: "genre", slug: s })),
      trackTitles, rating: null,
      cover: a.cover_xl || a.cover_big || null,
      deezerAlbumId: a.id, upc: a.upc || null, nbTracks: a.nb_tracks || null,
    },
    significance: emptySig(), timeline: [], quotes: [], faq: [],
    hasLongform: false, seo: { noindex: true },
    _deezer: { fetchedAt: new Date().toISOString(), source: `https://api.deezer.com/album/${a.id}`, raw: a },
  };

  const albumMdx = `---\n${yaml({
    title: a.title, slug,
    rapper: NAME.rapper[artistSlug] || a.artist?.name || artistSlug,
    rapperSlug: artistSlug,
    label: labelSlug ? (NAME.label[labelSlug] || a.label) : (a.label || undefined),
    labelSlug: labelSlug || undefined,
    year: year ?? undefined, genre: genres,
    description: `${a.title} — ${labelOfType(a.record_type)} od ${NAME.rapper[artistSlug] || a.artist?.name || artistSlug}${year ? ` (${year})` : ""}.`,
    image: a.cover_xl || undefined, tracklist: trackTitles.length ? trackTitles : undefined,
    publishedAt: TODAY,
  })}\n---\n\n## O albu\n\n_Stub — doplnit._\n`;

  writeEntity({
    label: "album", slug,
    jsonPath: D(path.join(DIR.albums, `${slug}.json`)), json: albumJson,
    mdxPath: D(path.join(DIR.mdxAlbums, `${slug}.mdx`)), mdx: albumMdx,
    warn: warnRefs(artistSlug, RAPPER_SLUGS, "artist"),
  });
  if (!ALBUM_SLUGS.has(slug)) ALBUM_SLUGS.add(slug);
}

// ──────────────── ARTIST ────────────────
async function processArtist(idOrUrl) {
  const id = parseDeezerId(idOrUrl);
  if (!id) return console.log(`⚠ Nelze parsovat artist ID: ${idOrUrl}`);
  const a = await dz(`artist/${id}`);
  if (a.error) throw new Error(`Deezer: ${a.error.message}`);
  await saveArtist(a);

  if (FLAGS.pullAlbums) {
    const albums = await dzPage(`artist/${a.id}/albums`, FLAGS.limitAlbums);
    console.log(`  → ${albums.length} alb`);
    for (const al of albums) {
      await processAlbum(String(al.id));
      await sleep(280);
    }
  }
}

async function saveArtist(a) {
  const existing = MAP.byId?.[String(a.id)] || resolveByName(a.name);
  const slug = existing || slugify(a.name);

  const rapperJson = {
    id: `rapper_${slug}`, kind: "rapper", slug,
    title: a.name, aliases: [], summary: "",
    status: "stub", createdAt: TODAY, updatedAt: TODAY,
    meta: {
      realName: "", born: "", active: {}, genres: [], primaryLabel: null, socials: {},
      deezerId: a.id, image: a.picture_xl || a.picture_big || null,
      nbFans: a.nb_fan || null, nbAlbums: a.nb_album || null,
    },
    significance: emptySig(), timeline: [], quotes: [], faq: [],
    hasLongform: false, seo: { noindex: true },
    _deezer: { fetchedAt: new Date().toISOString(), source: `https://api.deezer.com/artist/${a.id}`, raw: a },
  };

  const rapperMdx = `---\n${yaml({
    title: a.name, slug,
    description: `${a.name} — interpret české/slovenské rapové scény.`,
    publishedAt: TODAY,
  })}\n---\n\n## Bio\n\n_Stub — doplnit._\n`;

  writeEntity({
    label: "rapper", slug,
    jsonPath: D(path.join(DIR.rappers, `${slug}.json`)), json: rapperJson,
    mdxPath: D(path.join(DIR.mdxRappers, `${slug}.mdx`)), mdx: rapperMdx,
  });

  MAP.byId = MAP.byId || {};
  if (MAP.byId[String(a.id)] !== slug) { MAP.byId[String(a.id)] = slug; saveMap(); }
  RAPPER_SLUGS.add(slug); NAME.rapper[slug] = a.name;
}

// ──────────────── ZÁPIS ────────────────
function writeEntity({ label, slug, jsonPath, json, mdxPath, mdx, warn = [] }) {
  if (FLAGS.dryRun) {
    console.log(`[dry-run] ${label} ${slug}\n${JSON.stringify(json.meta, null, 2)}`);
    return;
  }
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  if (!fs.existsSync(jsonPath) || FLAGS.force) fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n", "utf8");
  let mdxNote = "";
  if (!FLAGS.noMdx) {
    fs.mkdirSync(path.dirname(mdxPath), { recursive: true });
    if (!fs.existsSync(mdxPath)) { fs.writeFileSync(mdxPath, mdx, "utf8"); mdxNote = " + mdx"; }
    else mdxNote = " (mdx existuje — nepřepisuji)";
  }
  console.log(`  ✓ ${label} ${slug}${mdxNote}`);
  warn.forEach((w) => console.log(`    ⚠ ${w}`));
}

// ──────────────── DEEZER ────────────────
async function dz(p) {
  const r = await fetch(`https://api.deezer.com/${p}`);
  if (!r.ok) throw new Error(`Deezer HTTP ${r.status} (${p})`);
  return r.json();
}
async function dzPage(p, limit) {
  let url = `https://api.deezer.com/${p}?limit=100`;
  const out = [];
  while (url && out.length < limit) {
    const res = await (await fetch(url)).json();
    out.push(...(res.data || []));
    url = res.next || null; if (url) await sleep(250);
  }
  return out.slice(0, limit);
}

// ──────────────── RESOLVERY ────────────────
function resolveArtist(id, name) {
  if (id != null && MAP.byId?.[String(id)]) return MAP.byId[String(id)];
  return resolveByName(name);
}
function resolveByName(name) {
  if (!name) return null;
  const s = slugify(name); if (RAPPER_SLUGS.has(s)) return s; if (ALIAS.has(s)) return ALIAS.get(s);
  const d = despace(name); if (ALIAS.has(d)) return ALIAS.get(d);
  return null;
}
function matchAlbumSlug(title) {
  const exact = slugify(title); if (ALBUM_SLUGS.has(exact)) return exact;
  const norm = slugify(normTitle(title)); if (ALBUM_SLUGS.has(norm)) return norm;
  let best = null;
  for (const s of ALBUM_SLUGS) if (norm === s || norm.startsWith(s + "-")) if (!best || s.length > best.length) best = s;
  return best || norm;
}

// ──────────────── POMOCNÉ ────────────────
function parseDeezerId(s) {
  if (!s) return null;
  const m = String(s).match(/(?:artist|album|track)\/(\d+)/) || String(s).match(/^(\d+)$/);
  return m ? m[1] : null;
}
function recordType(rt) { return rt === "ep" ? "ep" : rt === "single" ? "single" : rt === "compile" ? "compilation" : "lp"; }
function labelOfType(rt) { return rt === "ep" ? "EP" : rt === "single" ? "singl" : "album"; }
function fmtDur(s) { const m = Math.floor(s / 60), x = s % 60; return `${m}:${String(x).padStart(2, "0")}`; }
function yearOf(d) { const y = parseInt(String(d || "").slice(0, 4), 10); return Number.isFinite(y) && y > 1900 ? y : null; }
function cleanTitle(t) { return String(t).replace(/\s*\((?:feat|ft|with)\.?[^)]*\)\s*$/i, "").trim(); }
function slugify(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function despace(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function normTitle(t) {
  return String(t).replace(/\s*[\(\[][^\)\]]*?(edition|edice|deluxe|reedice|remaster|version|anniversary)[^\)\]]*[\)\]]/ig, "")
    .replace(/\s*[-–—:]\s*(deluxe|reedice|remaster|anniversary)\b.*$/i, "").trim();
}
function emptySig() { return { why: "", whatChanged: "", context: "", distinguishing: "", oneLiner: "" }; }
function warnRefs(slug, set, label, extras = []) {
  const w = []; if (slug && !set.has(slug)) w.push(`${label}: ${slug} není v data/rappers/`);
  for (const e of extras) if (e && !set.has(e)) w.push(`feature: ${e} není v data/rappers/`);
  return w;
}
function yaml(obj) {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) out.push(`${k}: [${v.map((x) => JSON.stringify(String(x))).join(", ")}]`);
    else if (typeof v === "number") out.push(`${k}: ${v}`);
    else out.push(`${k}: ${JSON.stringify(String(v))}`);
  }
  return out.join("\n");
}
function nameIndex(dir) {
  const m = {};
  for (const f of listJson(D(dir))) { try { const j = JSON.parse(fs.readFileSync(path.join(D(dir), f), "utf8")); const s = j.slug || f.replace(/\.json$/, ""); m[s] = j.title || j.name || s; } catch {} }
  return m;
}
function buildAliasMap() {
  const map = new Map(); const put = (k, slug) => { if (k && !map.has(k)) map.set(k, slug); };
  for (const f of listJson(D(DIR.rappers))) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(D(DIR.rappers), f), "utf8")); } catch { continue; }
    const slug = j.slug || f.replace(/\.json$/, "");
    for (const v of [slug, j.title, j.name, j.meta?.realName, ...(j.aliases || [])]) {
      if (!v) continue; put(slugify(v), slug); put(despace(v), slug);
    }
  }
  return map;
}
function loadMap() {
  if (fs.existsSync(MAP_FILE)) { try { const m = JSON.parse(fs.readFileSync(MAP_FILE, "utf8")); m.byId = m.byId || {}; return m; } catch {} }
  return { byId: {}, exclude: [], unresolved: {} };
}
function saveMap() { fs.mkdirSync(D(DIR.maps), { recursive: true }); fs.writeFileSync(MAP_FILE, JSON.stringify(MAP, null, 2) + "\n", "utf8"); }
function listJson(dir) { try { return fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")); } catch { return []; } }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function printHelp() {
  console.log(`deezer.mjs — Deezer fetcher pro 4rap rap-engine

  search   "<dotaz>"        [--type track|album|artist]  (interaktivní výběr)
  track    <id|url> [...]    (více ID oddělených mezerou)
  album    <id|url> [...]    [--no-tracks --limit-tracks N]
  artist   <id|url> [...]    [--pull-albums --limit-albums N]

  spol.:  --dry-run  --force  --no-mdx`);
}
