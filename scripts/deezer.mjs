#!/usr/bin/env node
/**
 * deezer.mjs — JEDEN skript pro všechna Deezer data
 *
 * Stahuje, mapuje a ukládá přímo do našich content/ složek.
 *
 *   node scripts/deezer.mjs search "yzomandias"              # vyhledá + interaktivní výběr
 *   node scripts/deezer.mjs search "noir yzomandias" --type track
 *
 *   node scripts/deezer.mjs track 3087922611                  # uloží skladbu
 *   node scripts/deezer.mjs album 911158401                   # uloží album + skladby
 *   node scripts/deezer.mjs artist 10525251 --pull-albums     # rapper + alba + skladby
 *   node scripts/deezer.mjs artist 10525251                    # jen rapper
 *
 *   flagy: --dry-run --force --no-tracks --limit-tracks N --limit-albums N
 *
 * ═══════════════════════════════════════════════════════════════
 * DATOVÁ STRUKTURA:
 *
 * content/alba/<slug>.mdx          → album/EP (frontmatter: title, slug, rapper,
 *                                     rapperSlug, label, labelSlug, year,
 *                                     releaseType, genre[], description, image,
 *                                     tracklist[], publishedAt)
 *
 * content/skladby/<slug>-<artist>.mdx  → skladba (title, slug, rapper, rapperSlug,
 *                                     features[], featuresNames[], album, albumSlug,
 *                                     year, genre[], duration, trackNumber,
 *                                     producers[], producersNames[], description,
 *                                     publishedAt)
 *
 * content/raperi/<slug>.mdx        → rapper (title, slug, realName, born,
 *                                     active, label, genre[], description,
 *                                     publishedAt)
 *
 * content/labely/<slug>.mdx        → label (title, slug, founded, location,
 *                                     description, publishedAt)
 *
 * data/albums/<slug>.json          → detailní JSON pro agregace
 * data/tracks/<slug>.json          → detailní JSON pro agregace
 * data/rappers/<slug>.json         → detailní JSON pro agregace
 * data/maps/deezer-artists.json    → Deezer ID → slug mapa
 * ═══════════════════════════════════════════════════════════════
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";

// ──────────────── BASE ────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const D = (p) => path.join(ROOT, p);
const TODAY = new Date().toISOString().slice(0, 10);
const MAP_FILE = D("data/maps/deezer-artists.json");

// Top-level mutable state (init v main())
let RAPPER_SLUGS, ALBUM_SLUGS, LABEL_SLUGS, GENRE_SLUGS;
let LABEL_MAP, MAP, ALIAS, NAME;

// ──────────────── ARGS ────────────────
const argv = process.argv.slice(2);
const cmd = argv.shift() || null;
const operands = [];
const FLAGS = {
  dryRun: false, force: false, noTracks: false,
  pullAlbums: false, type: null,
  limitAlbums: 999, limitTracks: 9999,
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dry-run") FLAGS.dryRun = true;
  else if (a === "--force") FLAGS.force = true;
  else if (a === "--no-tracks") FLAGS.noTracks = true;
  else if (a === "--pull-albums") FLAGS.pullAlbums = true;
  else if (a === "--type" && argv[i + 1]) { FLAGS.type = argv[++i]; }
  else if (a === "--limit-albums" && argv[i + 1]) { FLAGS.limitAlbums = parseInt(argv[++i], 10); }
  else if (a === "--limit-tracks" && argv[i + 1]) { FLAGS.limitTracks = parseInt(argv[++i], 10); }
  else operands.push(a);
}

main().catch((e) => { console.error("\n✖", e.message); process.exit(1); });

async function main() {
  // Lazy init — až v main(), aby byly všechny funkce definované
  RAPPER_SLUGS = new Set(loadSlugs("content/raperi"));
  ALBUM_SLUGS   = new Set(loadSlugs("content/alba"));
  LABEL_SLUGS   = new Set(loadSlugs("content/labely"));
  GENRE_SLUGS   = new Set(loadSlugs("content/zanry"));
  LABEL_MAP     = loadLabelMap();
  MAP           = loadMap();
  ALIAS         = buildAliasMap();
  NAME = {
    rapper: nameIndex("data/rappers", "content/raperi"),
    album: nameIndex("data/albums", "content/alba"),
    label: nameIndex("maps", "content/labely"),
  };
  if (!cmd) return printHelp();
  if (cmd === "search") return runSearch(operands.join(" "));
  if (cmd === "track") return runBatch(operands, processTrack);
  if (cmd === "album") return runBatch(operands, processAlbum);
  if (cmd === "artist") return runBatch(operands, processArtist);
  printHelp();
}

// ──────────────── BATCH ────────────────
async function runBatch(ids, fn) {
  if (!ids.length) return console.log("Zadej alespoň jedno Deezer ID nebo URL.");
  for (const id of ids) {
    try { await fn(id); } catch (e) { console.error(`\n✖ Chyba u ${id}: ${e.message}`); }
    if (ids.indexOf(id) < ids.length - 1) await sleep(350);
  }
}

// ──────────────── SEARCH ────────────────
async function runSearch(query) {
  if (!query) return console.log("Zadej dotaz: deezer.mjs search \"yzomandias\" [--type track|album|artist]");
  const type = FLAGS.type || "track";
  const ep = type === "artist" ? "search/artist" : type === "album" ? "search/album" : "search/track";
  const r = await dz(`${ep}?q=${encodeURIComponent(query)}&limit=10`);
  const items = r.data || [];
  if (!items.length) return console.log("Nic nenalezeno.");

  console.log(`\nTop ${items.length} ${type}:`);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (type === "artist")
      console.log(`  [${i + 1}] id ${it.id}  ${it.name}  (${it.nb_fan?.toLocaleString() || "?"} fans)`);
    else if (type === "album")
      console.log(`  [${i + 1}] id ${it.id}  "${it.title}" — ${it.artist?.name}  (${it.nb_tracks} skl.)`);
    else
      console.log(`  [${i + 1}] id ${it.id}  "${it.title}" — ${it.artist?.name}  @ ${it.album?.title}`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nVyber (např. 1,3-5) nebo Enter pro přeskočení: `);
  rl.close();
  const sel = parseSelection(answer, items.length);
  for (const idx of sel) {
    const it = items[idx - 1];
    console.log(`\n→ Zpracovávám [${idx}]: ${it.name || it.title}`);
    if (type === "artist") await processArtist(String(it.id));
    else if (type === "album") await processAlbum(String(it.id));
    else await processTrack(String(it.id));
    await sleep(300);
  }
}
function parseSelection(input, max) {
  if (!input) return [];
  const s = new Set();
  input.split(",").forEach((p) => {
    p = p.trim();
    if (p.includes("-")) { const [a, b] = p.split("-").map(Number); for (let i = a; i <= Math.min(b, max); i++) if (i > 0) s.add(i); }
    else { const n = parseInt(p, 10); if (n > 0 && n <= max) s.add(n); }
  });
  return [...s].sort((a, b) => a - b);
}

// ════════════════════════════════════════
//  TRACK
// ════════════════════════════════════════
async function processTrack(idOrUrl) {
  const id = parseId(idOrUrl);
  if (!id) return console.log(`⚠ Neplatné track ID: ${idOrUrl}`);
  const t = await dz(`track/${id}`);
  if (t.error) throw new Error(`Deezer: ${t.error.message}`);
  await saveTrack(t);
}

async function saveTrack(t, ctx = {}) {
  const primaryName  = t.contributors?.find((c) => c.role === "Main")?.name || t.artist?.name || "";
  const primaryId    = t.artist?.id;
  const primarySlug  = ctx.primarySlug || resolveArtist(primaryId, primaryName) || slugify(primaryName);

  const title = cleanTitle(t.title);
  const slug = `${slugify(title)}-${primarySlug}`.replace(/^-+|-+$/g, "");

  // Features
  const features = (t.contributors || [])
    .filter((c) => c.id !== primaryId)
    .map((c) => ({ name: c.name, slug: resolveArtist(c.id, c.name) || slugify(c.name) }));
  const featDedup = [...new Map(features.map((x) => [x.slug, x])).values()];

  // Album context
  const albumTitle = ctx.albumTitle || t.album?.title || null;
  const albumSlug  = ctx.albumSlug || (albumTitle ? matchAlbumSlug(albumTitle) : null);
  const year       = ctx.year || yearOf(t.release_date || t.album?.release_date);

  // Genres from album contexts (Deezer tracks don't have genres directly)
  const genres = ctx.genres || [];

  // Ensure rapper exists
  if (!RAPPER_SLUGS.has(primarySlug)) {
    const stubName = NAME.rapper?.[primarySlug] || primaryName || primarySlug;
    await createRapperStub(primarySlug, stubName, { deezerId: primaryId });
  }
  for (const f of featDedup) {
    if (!RAPPER_SLUGS.has(f.slug)) await createRapperStub(f.slug, f.name);
  }

  // MDX frontmatter
  const trackYaml = [
    `title: ${JSON.stringify(title)}`,
    `slug: ${JSON.stringify(slug)}`,
    `rapper: ${JSON.stringify(NAME.rapper[primarySlug] || primaryName || primarySlug)}`,
    `rapperSlug: ${JSON.stringify(primarySlug)}`,
    `features: [${featDedup.map((f) => JSON.stringify(f.slug)).join(", ")}]`,
    `featuresNames: [${featDedup.map((f) => JSON.stringify(f.name)).join(", ")}]`,
    albumTitle ? `album: ${JSON.stringify(albumTitle)}` : null,
    albumSlug ? `albumSlug: ${JSON.stringify(albumSlug)}` : null,
    year ? `year: ${year}` : null,
    `genre: [${genres.map((g) => JSON.stringify(g)).join(", ")}]`,
    t.duration ? `duration: ${JSON.stringify(fmtDur(t.duration))}` : null,
    t.track_position ? `trackNumber: ${t.track_position}` : (ctx.trackNumber ? `trackNumber: ${ctx.trackNumber}` : null),
    `producers: []`,
    `producersNames: []`,
    `description: ${JSON.stringify(`${title} — skladba od ${NAME.rapper[primarySlug] || primaryName}${albumTitle ? ` z alba ${albumTitle}` : ""}${year ? ` (${year})` : ""}.`)}`,
    `publishedAt: ${JSON.stringify(TODAY)}`,
  ].filter(Boolean).join("\n");

  const trackMdx = `---\n${trackYaml}\n---\n\n**[${title}](/skladby/${slug})** od [${NAME.rapper[primarySlug] || primaryName}](/raperi/${primarySlug})${albumTitle ? ` z alba [${albumTitle}](/alba/${albumSlug})` : ""}${year ? ` (${year})` : ""}.\n`;

  // JSON for internal use
  const trackJson = {
    id: `track_${slug}`, kind: "track", slug, title, status: "stub",
    createdAt: TODAY, updatedAt: TODAY,
    meta: {
      primaryArtist: { kind: "rapper", slug: primarySlug },
      features: featDedup.map((f) => ({ kind: "rapper", slug: f.slug })),
      album: albumSlug ? { kind: "album", slug: albumSlug } : null,
      producers: [], year, duration: t.duration ? fmtDur(t.duration) : null,
      trackNumber: t.track_position ?? ctx.trackNumber ?? null,
      genres, deezerId: t.id, isrc: t.isrc || null,
      explicit: !!t.explicit_lyrics, cover: t.album?.cover_xl || t.album?.cover_big || null,
      previewUrl: t.preview || null,
    },
    _deezer: { fetchedAt: new Date().toISOString(), raw: t },
  };

  writeEntity({ label: "track", slug, mdx: trackMdx, json: trackJson });
}

// ════════════════════════════════════════
//  ALBUM
// ════════════════════════════════════════
async function processAlbum(idOrUrl) {
  const id = parseId(idOrUrl);
  if (!id) return console.log(`⚠ Neplatné album ID: ${idOrUrl}`);
  const a = await dz(`album/${id}`);
  if (a.error) throw new Error(`Deezer: ${a.error.message}`);
  await saveAlbum(a);

  if (!FLAGS.noTracks) {
    const tracks = (a.tracks?.data || []).slice(0, FLAGS.limitTracks);
    console.log(`  → ${tracks.length} skladeb`);
    const artistSlug = resolveArtist(a.artist?.id, a.artist?.name) || slugify(a.artist?.name || "");
    const albumSlug2 = matchAlbumSlug(a.title);
    // Get genres from album
    const albumGenres = (a.genres?.data || []).map((g) => normalizeGenre(g.name)).filter((s) => GENRE_SLUGS.has(s));

    for (let i = 0; i < tracks.length; i++) {
      const full = await dz(`track/${tracks[i].id}`);
      await sleep(280);
      await saveTrack(full, {
        primarySlug: artistSlug,
        albumSlug: albumSlug2,
        albumTitle: a.title,
        trackNumber: i + 1,
        year: yearOf(a.release_date),
        genres: albumGenres,
      });
    }
  }
}

async function saveAlbum(a) {
  const artistSlug = resolveArtist(a.artist?.id, a.artist?.name) || slugify(a.artist?.name || "");
  const slug = matchAlbumSlug(a.title);
  const year = yearOf(a.release_date);
  const tracks = (a.tracks?.data || []).slice(0, FLAGS.limitTracks);
  const tracklist = tracks.map((t) => t.title);
  const genreSlugs = (a.genres?.data || []).map((g) => normalizeGenre(g.name)).filter((s) => GENRE_SLUGS.has(s));
  const recordType = a.record_type || "album";
  const releaseType = recordType === "ep" ? "ep" : recordType === "single" ? "single" : "album";

  // Pokud je single, ukládáme jako skladbu, ne album
  if (releaseType === "single") {
    console.log(`  → single — ukládám jako skladbu`);
    if (tracks.length > 0) {
      const fullTrack = await dz(`track/${tracks[0].id}`);
      await saveTrack(fullTrack, {
        primarySlug: artistSlug,
        albumSlug: null,
        albumTitle: null,
        year,
        genres: genreSlugs,
      });
    }
    return;
  }

  // Label
  const labelSlug = resolveLabel(a.label);

  // Ensure rapper exists
  if (!RAPPER_SLUGS.has(artistSlug)) {
    await createRapperStub(artistSlug, a.artist?.name || artistSlug, { deezerId: a.artist?.id });
  }

  // MDX frontmatter
  const albumYaml = [
    `title: ${JSON.stringify(a.title)}`,
    `slug: ${JSON.stringify(slug)}`,
    `rapper: ${JSON.stringify(NAME.rapper[artistSlug] || a.artist?.name || artistSlug)}`,
    `rapperSlug: ${JSON.stringify(artistSlug)}`,
    a.label && labelSlug ? `label: ${JSON.stringify(NAME.label[labelSlug] || a.label)}` : (a.label ? `label: ${JSON.stringify(a.label)}` : null),
    labelSlug ? `labelSlug: ${JSON.stringify(labelSlug)}` : null,
    year ? `year: ${year}` : null,
    `releaseType: ${JSON.stringify(releaseType)}`,
    `genre: [${genreSlugs.map((g) => JSON.stringify(g)).join(", ")}]`,
    `description: ${JSON.stringify(makeAlbumDesc(a.title, releaseType, NAME.rapper[artistSlug] || a.artist?.name || artistSlug, year, a.nb_tracks))}`,
    a.cover_xl ? `image: ${JSON.stringify(a.cover_xl)}` : null,
    tracklist.length > 0 ? `tracklist: [${tracklist.map((t) => JSON.stringify(t.trim())).join(", ")}]` : null,
    `publishedAt: ${JSON.stringify(TODAY)}`,
  ].filter(Boolean).join("\n");

  const body = makeAlbumBody(a.title, artistSlug, NAME.rapper[artistSlug] || a.artist?.name || artistSlug, year, releaseType, labelSlug, tracks.length);

  const albumMdx = `---\n${albumYaml}\n---\n\n${body}`;

  // JSON
  const albumJson = {
    id: `album_${slug}`, kind: "album", slug, title: a.title, status: "stub",
    createdAt: TODAY, updatedAt: TODAY,
    meta: {
      artist: { kind: "rapper", slug: artistSlug },
      label: labelSlug ? { kind: "label", slug: labelSlug } : null,
      labelName: a.label || null,
      year, releaseType, genres: genreSlugs,
      tracklist, rating: null,
      cover: a.cover_xl || a.cover_big || null,
      deezerAlbumId: a.id, nbTracks: a.nb_tracks,
    },
    _deezer: { fetchedAt: new Date().toISOString(), raw: a },
  };

  writeEntity({ label: "album", slug, mdx: albumMdx, json: albumJson });
  if (!ALBUM_SLUGS.has(slug)) ALBUM_SLUGS.add(slug);
}

// ════════════════════════════════════════
//  ARTIST (Rapper)
// ════════════════════════════════════════
async function processArtist(idOrUrl) {
  const id = parseId(idOrUrl);
  if (!id) return console.log(`⚠ Neplatné artist ID: ${idOrUrl}`);
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

async function saveArtist(a, ctx = {}) {
  const existing = MAP.byId?.[String(a.id)] || resolveByName(a.name);
  const slug = existing || slugify(a.name);

  const rapperYaml = [
    `title: ${JSON.stringify(a.name)}`,
    `slug: ${JSON.stringify(slug)}`,
    ctx.realName ? `realName: ${JSON.stringify(ctx.realName)}` : null,
    ctx.born ? `born: ${JSON.stringify(ctx.born)}` : null,
    ctx.active ? `active: ${JSON.stringify(ctx.active)}` : null,
    ctx.label ? `label: ${JSON.stringify(ctx.label)}` : null,
    `genre: [${(ctx.genres || []).map((g) => JSON.stringify(g)).join(", ")}]`,
    `description: ${JSON.stringify(makeRapperDesc(a.name, ctx.genres || []))}`,
    `publishedAt: ${JSON.stringify(TODAY)}`,
  ].filter(Boolean).join("\n");

  const rapperMdx = `---\n${rapperYaml}\n---\n\n## Bio\n\n_Stub — doplnit._\n`;

  const rapperJson = {
    id: `rapper_${slug}`, kind: "rapper", slug, title: a.name, status: "stub",
    createdAt: TODAY, updatedAt: TODAY,
    meta: {
      realName: ctx.realName || "", born: ctx.born || "", active: ctx.active || {},
      genres: ctx.genres || [], primaryLabel: ctx.label || null, socials: {},
      deezerId: a.id, image: a.picture_xl || a.picture_big || null,
      nbFans: a.nb_fan || null, nbAlbums: a.nb_album || null,
    },
    _deezer: { fetchedAt: new Date().toISOString(), raw: a },
  };

  writeEntity({ label: "rapper", slug, mdx: rapperMdx, json: rapperJson });

  // Update map
  MAP.byId = MAP.byId || {};
  if (MAP.byId[String(a.id)] !== slug) { MAP.byId[String(a.id)] = slug; saveMap(); }
  RAPPER_SLUGS.add(slug);
  NAME.rapper[slug] = a.name;
}

// ════════════════════════════════════════
//  RAPPER STUB (auto-create při track/album)
// ════════════════════════════════════════
async function createRapperStub(slug, name, opts = {}) {
  console.log(`  → vytvářím nového rappera: ${name} (${slug})`);
  const deezerId = opts.deezerId;
  let extra = {};
  if (deezerId) {
    try {
      const a = await dz(`artist/${deezerId}`);
      extra = { realName: a.name, genres: (a.genres?.data || []).map((g) => normalizeGenre(g.name)).filter((s) => GENRE_SLUGS.has(s)) };
    } catch {}
  }
  const yaml = [
    `title: ${JSON.stringify(name)}`,
    `slug: ${JSON.stringify(slug)}`,
    extra.realName ? `realName: ${JSON.stringify(extra.realName)}` : null,
    `genre: [${(extra.genres || []).map((g) => JSON.stringify(g)).join(", ")}]`,
    `description: ${JSON.stringify(`${name} — interpret české/slovenské rapové scény.`)}`,
    `publishedAt: ${JSON.stringify(TODAY)}`,
  ].filter(Boolean).join("\n");
  const mdx = `---\n${yaml}\n---\n\n## Bio\n\n_Stub — doplnit._\n`;
  const json = { id: `rapper_${slug}`, kind: "rapper", slug, title: name, status: "stub", createdAt: TODAY, updatedAt: TODAY, meta: { realName: "", deezerId, genres: extra.genres || [] }, _deezer: {} };

  writeEntity({ label: "rapper", slug, mdx, json });
  RAPPER_SLUGS.add(slug);
  NAME.rapper[slug] = name;
  if (deezerId && MAP.byId?.[String(deezerId)] !== slug) { MAP.byId[String(deezerId)] = slug; saveMap(); }
}

// ════════════════════════════════════════
//  ZÁPIS
// ════════════════════════════════════════
function writeEntity({ label, slug, mdx, json }) {
  const DIRS = { track: ["content/skladby", "data/tracks"], album: ["content/alba", "data/albums"], rapper: ["content/raperi", "data/rappers"] };
  const dirs = DIRS[label];
  if (!dirs) throw new Error(`Neznámý typ: ${label}`);

  const mdxPath = D(path.join(dirs[0], `${slug}.mdx`));
  const jsonPath = D(path.join(dirs[1], `${slug}.json`));

  if (FLAGS.dryRun) {
    console.log(`[dry-run] ${label} ${slug}`);
    return;
  }

  fs.mkdirSync(path.dirname(mdxPath), { recursive: true });
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });

  let note = "";
  if (!fs.existsSync(mdxPath) || FLAGS.force) {
    fs.writeFileSync(mdxPath, mdx, "utf8");
    note = " + mdx";
  } else {
    note = " (mdx existuje — --force pro přepsání)";
  }
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n", "utf8");

  console.log(`  ✓ ${label} ${slug}${note}`);
}

// ════════════════════════════════════════
//  DEEZER API
// ════════════════════════════════════════
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

// ════════════════════════════════════════
//  RESOLVERY
// ════════════════════════════════════════
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
function resolveLabel(name) {
  if (!name) return null;
  const s = slugify(name); if (LABEL_SLUGS.has(s)) return s;
  // Try LABEL_MAP
  if (LABEL_MAP.has(s)) return LABEL_MAP.get(s);
  // Fuzzy match
  for (const [ls, lname] of LABEL_MAP) {
    if (despace(name).includes(despace(lname)) || despace(lname).includes(despace(name))) return ls;
  }
  return null;
}
function matchAlbumSlug(title) {
  const norm = slugify(normTitle(title));
  if (ALBUM_SLUGS.has(norm)) return norm;
  // Fuzzy: find longest matching prefix
  let best = norm;
  for (const s of ALBUM_SLUGS) {
    if (norm === s || norm.startsWith(s + "-")) { if (!best || s.length > best.length) best = s; }
  }
  return norm;
}

// ════════════════════════════════════════
//  POMOCNÉ
// ════════════════════════════════════════
function parseId(s) {
  if (!s) return null;
  const m = String(s).match(/(?:artist|album|track)\/(\d+)/) || String(s).match(/^(\d+)$/);
  return m ? m[1] : null;
}
function slugify(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function despace(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
function normTitle(t) {
  return String(t).replace(/\s*[\(\[][^\)\]]*?(edition|edice|deluxe|reedice|remaster|version|anniversary)[^\)\]]*[\)\]]/ig, "")
    .replace(/\s*[-–—:]\s*(deluxe|reedice|remaster|anniversary)\b.*$/i, "").trim();
}
function cleanTitle(t) {
  return String(t).replace(/\s*\((?:feat|ft|with)\.?[^)]*\)\s*$/i, "").trim();
}
function fmtDur(s) {
  if (!s && s !== 0) return null;
  const m = Math.floor(s / 60), x = s % 60;
  return `${m}:${String(x).padStart(2, "0")}`;
}
function yearOf(d) {
  const y = parseInt(String(d || "").slice(0, 4), 10);
  return Number.isFinite(y) && y > 1900 ? y : null;
}

// Deezer genre → our genre slug
const GENRE_MAP = {
  "Rap/Hip Hop": "hip-hop", "Hip-Hop": "hip-hop", "hip-hop": "hip-hop",
  "Trap": "trap", "Drill": "drill", "Cloud Rap": "cloud-rap",
  "Emo Rap": "emo-rap", "Emo": "emo-rap",
  "Boom Bap": "boom-bap", "Boom-Bap": "boom-bap",
  "Alternative Rap": "alternative-rap", "Alternative Hip Hop": "alternative-rap",
  "Conscious Rap": "conscious-rap", "Conscious Hip Hop": "conscious-rap",
  "Experimental Rap": "experimental-hip-hop",
  "Dark Trap": "dark-trap", "Dark Trap/Drill": "dark-trap",
  "Drill/Trap": "drill", "Hardcore Rap": "hardcore-rap",
  "Gangsta Rap": "gangsta-rap", "G-Funk": "g-funk",
  "Pop Rap": "dance-rap", "Pop": "czech-pop",
  "R&B": "rnb", "R'n'B": "rnb", "RnB": "rnb",
  "Electronic": "electronic-rap", "Electro": "electronic-rap",
  "Dance": "dance-rap", "UK Drill": "drill",
  "Dubstep": "drum-and-bass", "Drum and Bass": "drum-and-bass",
  "Grime": "grime",
  "Lo-fi": "lo-fi-rap", "Lo-Fi": "lo-fi-rap",
  "Acoustic": "abstract-hip-hop",
  "World": "afro-rap", "Afrobeats": "afrobeats",
  "Reggae": "dancehall", "Dancehall": "dancehall",
  "Soul": "soul", "Funk": "funk",
  "Jazz": "jazz-rap", "Jazz Rap": "jazz-rap",
};
function normalizeGenre(name) {
  if (!name) return null;
  if (GENRE_MAP[name]) return GENRE_MAP[name];
  const s = slugify(name);
  if (GENRE_SLUGS.has(s)) return s;
  // Try pattern match
  const lower = name.toLowerCase();
  if (lower.includes("trap")) return "trap";
  if (lower.includes("drill")) return "drill";
  if (lower.includes("grime")) return "grime";
  if (lower.includes("boom") && lower.includes("bap")) return "boom-bap";
  if (lower.includes("hip") && lower.includes("hop") || lower.includes("rap")) return "hip-hop";
  if (lower.includes("r&b") || lower.includes("rnb")) return "rnb";
  if (lower.includes("emo") || lower.includes("sad") || lower.includes("dark")) return "dark-rap";
  if (lower.includes("lofi") || lower.includes("lo-fi")) return "lo-fi-rap";
  if (lower.includes("electronic") || lower.includes("electro") || lower.includes("dubstep")) return "electronic-rap";
  if (lower.includes("dance")) return "dance-rap";
  if (lower.includes("pop")) return "czech-pop";
  return s;
}

function makeAlbumDesc(title, releaseType, rapperName, year, nbTracks) {
  const typeLabel = releaseType === "ep" ? "EP" : "album";
  let desc = `${rapperName} v roce ${year} vydal${year ? "" : ""} ${typeLabel === "EP" ? "EP" : "album"} ${title}.`;
  if (nbTracks) desc += ` Obsahuje celkem ${nbTracks} skladeb.`;
  return desc;
}
function makeAlbumBody(title, artistSlug, rapperName, year, releaseType, labelSlug, trackCount) {
  const lines = [`[${rapperName}](/raperi/${artistSlug}) v roce ${year} vydal${releaseType === "ep" ? " EP" : releaseType === "single" ? " singl" : " album"} **${title}**.`];
  if (trackCount) lines.push(`\nAlbum obsahuje celkem ${trackCount} skladeb.`);
  if (labelSlug) lines.push(`\nDeska vyšla pod labelem [${NAME.label[labelSlug] || labelSlug}](/labely/${labelSlug}).`);
  return lines.filter(Boolean).join("\n\n");
}
function makeRapperDesc(name, genres) {
  const g = genres.slice(0, 3);
  let desc = `${name} — interpret české/slovenské rapové scény.`;
  if (g.length) desc += ` Tvoří v žánrech ${g.map((s) => `[${s.replace(/-/g, " ")}](/zanry/${s})`).join(", ")}.`;
  return desc;
}

// ──────────────── LOADERY ────────────────
function loadSlugs(dir) {
  try { return fs.readdirSync(D(dir)).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, "")); }
  catch { return []; }
}
function loadLabelMap() {
  const m = new Map();
  try {
    for (const f of fs.readdirSync(D("content/labely")).filter((f) => f.endsWith(".mdx"))) {
      const c = fs.readFileSync(D(`content/labely/${f}`), "utf8");
      const slug = f.replace(/\.mdx$/, "");
      const title = c.match(/^title:\s*"([^"]+)/m)?.[1] || slug;
      m.set(slugify(title), slug);
      m.set(slug, title);
    }
  } catch {}
  return m;
}
function buildAliasMap() {
  const map = new Map(); const put = (k, slug) => { if (k && !map.has(k)) map.set(k, slug); };
  for (const f of loadDir("data/rappers", ".json")) {
    try {
      const j = JSON.parse(fs.readFileSync(D(`data/rappers/${f}`), "utf8"));
      const slug = j.slug || f.replace(/\.json$/, "");
      for (const v of [slug, j.title, j.name, j.meta?.realName, ...(j.aliases || [])]) {
        if (!v) continue; put(slugify(v), slug); put(despace(v), slug);
      }
    } catch {}
  }
  // Also from content/raperi
  for (const f of loadDir("content/raperi", ".mdx")) {
    try {
      const c = fs.readFileSync(D(`content/raperi/${f}`), "utf8");
      const slug = f.replace(/\.mdx$/, "");
      const title = c.match(/^title:\s*"([^"]+)/m)?.[1];
      if (title) { put(slugify(title), slug); put(despace(title), slug); }
    } catch {}
  }
  return map;
}
function loadDir(dir, ext) {
  try { return fs.readdirSync(D(dir)).filter((f) => f.endsWith(ext) && !f.startsWith("_")); }
  catch { return []; }
}
function loadMap() {
  if (fs.existsSync(MAP_FILE)) {
    try { const m = JSON.parse(fs.readFileSync(MAP_FILE, "utf8")); m.byId = m.byId || {}; return m; } catch {}
  }
  return { byId: {}, exclude: [], unresolved: {} };
}
function saveMap() {
  fs.mkdirSync(D("data/maps"), { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(MAP, null, 2) + "\n", "utf8");
}
function nameIndex(...dirs) {
  const m = {};
  for (const d of dirs) {
    for (const f of loadDir(d, ".mdx")) {
      try {
        const c = fs.readFileSync(D(`${d}/${f}`), "utf8");
        const slug = f.replace(/\.mdx$/, "");
        const title = c.match(/^title:\s*"([^"]+)/m)?.[1] || slug;
        m[slug] = title;
      } catch {}
    }
    for (const f of loadDir(d, ".json")) {
      try {
        const j = JSON.parse(fs.readFileSync(D(`${d}/${f}`), "utf8"));
        m[j.slug] = j.title || j.name;
      } catch {}
    }
  }
  return m;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function printHelp() {
  console.log(`deezer.mjs — Univerzální Deezer fetcher

  search   "<dotaz>"                     [--type track|album|artist]
  track    <id> [id...]
  album    <id> [id...]                  [--no-tracks --limit-tracks N]
  artist   <id> [id...]                  [--pull-albums --limit-albums N]

  flags:   --dry-run   --force   --no-tracks

  Příklady:
    node scripts/deezer.mjs search "yzomandias" --type artist
    node scripts/deezer.mjs search "noir yzomandias" --type track
    node scripts/deezer.mjs artist 10525251 --pull-albums
    node scripts/deezer.mjs album 911158401              # album + skladby
    node scripts/deezer.mjs track 3087922611 12345       # jednu nebo víc skladeb
`);
}