#!/usr/bin/env node
/**
 * create-track.mjs — generátor stub .json souborů skladeb pro 4RAP / rap-engine
 *
 * Drží PŘESNĚ tvar schématu (ref objekty {kind, slug}, meta, significance, duration "m:ss", year).
 *
 *   Deezer -> fakta:  title, year, duration, trackNumber, album, primaryArtist, features
 *   Ollama -> jen:     summary (1 věta)        | significance zůstává prázdné (stub)
 *   manuál ->          producers, genres, timeline, quotes, faq
 *
 * REŽIMY:
 *   node scripts/create-track.mjs --rapper yzomandias          # VŠECHNY skladby interpreta (přes alba)
 *   node scripts/create-track.mjs --rapper yzomandias --deep   # + přesné features přes /track (víc volání)
 *   node scripts/create-track.mjs --query "yzomandias noir"    # jedna skladba
 *   node scripts/create-track.mjs --id 1234567                 # jedna skladba podle Deezer ID
 *   node scripts/create-track.mjs --batch tracks.txt           # 1 dotaz na řádek
 *
 * FLAGY:
 *   --dry-run            nic nezapíše, jen ukáže
 *   --force              přepíše existující soubory
 *   --limit N            strop počtu skladeb (rapper režim)
 *   --albums-only        v rapper režimu ber jen alba/EP (vynech singly)
 *   --inherit-genres     zdědit genres z data/rappers/<slug>.json
 *   --genres a,b         pevně nastavit genres
 *   --name "Jméno"       jméno pro Deezer search (jinak se čte z rapper JSONu)
 *   --ai / --no-ai       zapni/vypni Ollama summary  (default: zap u single, VYP u --rapper)
 *
 * ENV (.env.local):
 *   OLLAMA_API_KEY=...                     # nutné pro cloud (ollama.com)
 *   OLLAMA_BASE_URL=https://ollama.com     # nebo http://localhost:11434
 *   OLLAMA_MODEL=gemma3:4b
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
  genres: path.join(ROOT, "data", "genres"),
  mdx: path.join(ROOT, "content", "skladby"),
};

loadEnv(path.join(ROOT, ".env.local"));
const OLLAMA = {
  baseUrl: (process.env.OLLAMA_BASE_URL || "https://ollama.com").replace(/\/$/, ""),
  apiKey: process.env.OLLAMA_API_KEY || "",
  model: process.env.OLLAMA_MODEL || "gemma3:4b",
};

const args = parseArgs(process.argv.slice(2));
const FLAGS = {
  dryRun: !!args["dry-run"],
  force: !!args.force,
  deep: !!args.deep,
  albumsOnly: !!args["albums-only"],
  inheritGenres: !!args["inherit-genres"],
  limit: args.limit ? parseInt(args.limit, 10) : Infinity,
  fixedGenres: args.genres ? String(args.genres).split(",").map((s) => s.trim()).filter(Boolean) : null,
  noMdx: !!args["no-mdx"],
  noDeezerRaw: !!args["no-deezer-raw"],
};
// AI: default ON u jednotlivých, OFF u hromadného --rapper
const AI_ON = args["no-ai"] ? false : args.ai ? true : !args.rapper;
// kompletní /track fetch potřebujeme pro raw archiv i pro --deep features
const NEED_FULL = FLAGS.deep || !FLAGS.noDeezerRaw;

const seen = new Set();
let written = 0, skipped = 0;
const ALBUM_SLUGS = loadSlugSet(DIR.albums);

main().catch((e) => { console.error("\n✖ Chyba:", e.message); process.exit(1); });

async function main() {
  if (args.rapper) await runRapper(String(args.rapper));
  else if (args.id) await processTrackById(String(args.id));
  else if (args.batch) await runBatch(String(args.batch));
  else if (args.query) await processQuery(String(args.query));
  else return printHelp();
  console.log(`\n✓ Hotovo. Zapsáno: ${written}, přeskočeno: ${skipped}.`);
}

// ==================== REŽIM: RAPPER (všechny skladby) ====================
async function runRapper(rapperSlug) {
  const name = args.name || readEntityName(DIR.rappers, rapperSlug) || rapperSlug;
  console.log(`Rapper: ${rapperSlug} ("${name}")  AI summary: ${AI_ON ? "zap" : "vyp"}`);

  const artistId = await deezerFindArtist(name);
  if (!artistId) throw new Error(`Deezer: interpret "${name}" nenalezen.`);

  const albums = await deezerArtistAlbums(artistId);
  const filtered = FLAGS.albumsOnly ? albums.filter((a) => ["album", "ep"].includes(a.record_type)) : albums;
  console.log(`  Alb/EP/singlů: ${filtered.length}`);

  for (const al of filtered) {
    if (written >= FLAGS.limit) break;
    const albumSlug = matchAlbumSlug(al.title);
    const year = yearOf(al.release_date);
    const album = await deezerAlbum(al.id);
    const tracks = album?.tracks?.data || [];
    console.log(`  • ${al.title} (${year ?? "?"}) — ${tracks.length} skl.`);

    for (let ti = 0; ti < tracks.length; ti++) {
      if (written >= FLAGS.limit) break;
      const lite = tracks[ti];
      let full = lite;
      if (NEED_FULL) { full = await deezerTrack(lite.id); await sleep(280); }
      await buildAndWrite(full, {
        primaryArtistSlug: rapperSlug,
        albumSlug, year,
        trackNumber: full.track_position ?? lite.track_position ?? (ti + 1),
      });
    }
    await sleep(280);
  }
}

// ==================== REŽIM: jednotlivé ====================
async function processQuery(query) {
  const hit = await deezerSearchPick(query);
  if (!hit) throw new Error("Skladba nenalezena.");
  await processTrackById(hit.id);
}
async function processTrackById(id) {
  const full = await deezerTrack(id);
  const primaryName = (full.contributors?.find((c) => c.role === "Main")?.name) || full.artist?.name || "";
  await buildAndWrite(full, {
    primaryArtistSlug: args.artist || slugify(primaryName),
    albumSlug: full.album?.title ? matchAlbumSlug(full.album.title) : null,
    year: yearOf(full.release_date || full.album?.release_date),
    trackNumber: full.track_position ?? null,
  });
}
async function runBatch(file) {
  const lines = fs.readFileSync(path.resolve(ROOT, file), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  for (let i = 0; i < lines.length; i++) {
    console.log(`\n[${i + 1}/${lines.length}] ${lines[i]}`);
    try { await processQuery(lines[i]); } catch (e) { console.error("  ✖", e.message); }
    await sleep(350);
  }
}

// ==================== SESTAVENÍ + ZÁPIS ====================
async function buildAndWrite(dz, ctx) {
  const title = cleanTitle(dz.title);
  const primarySlug = ctx.primaryArtistSlug;
  const { features } = parseFeatures(dz.title, dz.contributors, primarySlug);
  const slug = `${slugify(title)}-${primarySlug}`;

  if (seen.has(slug)) { skipped++; return; }
  seen.add(slug);

  const outFile = path.join(DIR.tracks, `${slug}.json`);
  if (fs.existsSync(outFile) && !FLAGS.force && !FLAGS.dryRun) {
    console.log(`    ⏭  ${slug}.json existuje`);
    skipped++; return;
  }

  const warn = [];
  checkExists(DIR.rappers, primarySlug, warn, "primaryArtist");
  const featRefs = features.map((n) => {
    const s = slugify(n); checkExists(DIR.rappers, s, warn, `feature "${n}"`); return ref("rapper", s);
  });

  const genreSlugs = (FLAGS.fixedGenres || (FLAGS.inheritGenres ? readGenres(primarySlug) : []));
  const genres = genreSlugs.map((g) => ref("genre", slugify(g)));

  let summary = "";
  if (AI_ON) {
    summary = await ollamaSummary({ title, artist: nameFromContributors(dz), album: dz.album?.title });
    await sleep(120);
  }

  const today = new Date().toISOString().slice(0, 10);
  const deezerBlock = FLAGS.noDeezerRaw ? null : {
    fetchedAt: new Date().toISOString(),
    source: `https://api.deezer.com/track/${dz.id}`,
    text: formatDeezerText(dz),
    raw: dz,
  };
  const track = {
    id: `track_${slug}`,
    kind: "track",
    slug,
    title,
    aliases: [],
    summary,
    status: "stub",
    createdAt: today,
    updatedAt: today,
    meta: {
      primaryArtist: ref("rapper", primarySlug),
      features: featRefs,
      album: ctx.albumSlug ? ref("album", ctx.albumSlug) : null,
      producers: [],
      year: ctx.year ?? null,
      duration: dz.duration ? formatDuration(dz.duration) : null,
      trackNumber: ctx.trackNumber ?? null,
      genres,
    },
    significance: { why: "", whatChanged: "", context: "", distinguishing: "", oneLiner: "" },
    timeline: [],
    quotes: [],
    faq: [],
    hasLongform: false,
    seo: { noindex: true },
    ...(deezerBlock ? { _deezer: deezerBlock } : {}),
  };

  if (FLAGS.dryRun) {
    console.log("    --dry-run:\n" + JSON.stringify(track, null, 2));
    return;
  }
  fs.mkdirSync(DIR.tracks, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(track, null, 2) + "\n", "utf8");
  written++;
  console.log(`    ✓ ${slug}.json${summary ? "  …summary" : ""}`);

  // MDX (stránka pro Contentlayer) — bez něj se skladba nezobrazí
  if (!FLAGS.noMdx) writeMdx({
    slug, title, today,
    primarySlug, primaryName: nameOf(DIR.rappers, primarySlug, nameFromContributors(dz)),
    featSlugs: featRefs.map((f) => f.slug),
    featNames: features,
    albumSlug: ctx.albumSlug, albumTitle: dz.album?.title || null,
    year: ctx.year, duration: dz.duration ? formatDuration(dz.duration) : "",
    trackNumber: ctx.trackNumber, genreSlugs,
    description: summary || `${title} — skladba od ${nameOf(DIR.rappers, primarySlug, nameFromContributors(dz))}.`,
  });

  warn.forEach((w) => console.log(`      ⚠ ${w}`));
}

// ==================== DEEZER ====================
async function deezerFindArtist(name) {
  const res = await jget(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`);
  const list = res.data || [];
  if (!list.length) return null;
  const exact = list.find((a) => slugify(a.name) === slugify(name));
  const pick = exact || list[0];
  console.log(`  Deezer artist: ${pick.name} [${pick.id}]`);
  return pick.id;
}
async function deezerArtistAlbums(artistId) {
  let url = `https://api.deezer.com/artist/${artistId}/albums?limit=100`;
  const out = [];
  while (url && out.length < 500) {
    const res = await jget(url);
    out.push(...(res.data || []));
    url = res.next || null;
    if (url) await sleep(250);
  }
  return out;
}
async function deezerAlbum(id) {
  try { return await jget(`https://api.deezer.com/album/${id}`); } catch { return null; }
}
async function deezerTrack(id) {
  const t = await jget(`https://api.deezer.com/track/${id}`);
  if (t.error) throw new Error(`Deezer: ${t.error.message || "track nenalezen"}`);
  return t;
}
async function deezerSearchPick(query) {
  const res = await jget(`https://api.deezer.com/search/track?q=${encodeURIComponent(query)}&limit=5`);
  const list = res.data || [];
  if (!list.length) return null;
  if (list.length > 1) {
    console.log("  Nálezy (beru 1.; jinak --id):");
    list.slice(0, 5).forEach((t, i) => console.log(`    ${i === 0 ? "→" : " "} [${t.id}] ${t.title} — ${t.artist?.name}`));
  }
  return list[0];
}

// ==================== OLLAMA (jen summary) ====================
async function ollamaSummary({ title, artist, album }) {
  const isCloud = /ollama\.com/.test(OLLAMA.baseUrl);
  if (isCloud && !OLLAMA.apiKey) { console.log("    ⚠ Ollama cloud bez OLLAMA_API_KEY — summary prázdné."); return ""; }

  const system =
    "Jsi hudební editor české rapové encyklopedie. Vracíš POUZE validní JSON. " +
    "NEUVÁDĚJ žádná fakta (rok, čísla, producenty, žebříčky) — neznáš je a nesmíš je vymýšlet. " +
    "Napiš jednu výstižnou českou větu o tématu/náladě skladby na základě názvu, interpreta a alba.";
  const user = `Skladba: "${title}"\nInterpret: ${artist}\nAlbum: ${album || "neznámé"}\n\nVrať JSON: {"summary": "jedna česká věta"}`;

  try {
    const res = await fetch(`${OLLAMA.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(OLLAMA.apiKey ? { Authorization: `Bearer ${OLLAMA.apiKey}` } : {}) },
      body: JSON.stringify({
        model: OLLAMA.model, stream: false, format: "json", options: { temperature: 0.6 },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const parsed = safeJson(data?.message?.content || "");
    return typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
  } catch (e) { console.log(`    ⚠ Ollama selhalo (${e.message}) — summary prázdné.`); return ""; }
}

// ==================== POMOCNÉ ====================
function ref(kind, slug) { return { kind, slug }; }
function formatDeezerText(t) {
  const contrib = (t.contributors || []).map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}`).join(", ");
  const L = [];
  L.push(`Deezer ID: ${t.id}`);
  L.push(`Název: ${t.title}${t.title_version ? " " + t.title_version : ""}`);
  if (t.artist?.name) L.push(`Interpret: ${t.artist.name}`);
  if (contrib) L.push(`Účinkující: ${contrib}`);
  if (t.album?.title) L.push(`Album: ${t.album.title}`);
  if (t.release_date) L.push(`Vydáno: ${t.release_date}`);
  if (t.duration) L.push(`Délka: ${formatDuration(t.duration)} (${t.duration}s)`);
  if (t.track_position) L.push(`Track #: ${t.track_position}`);
  if (t.disk_number) L.push(`Disk: ${t.disk_number}`);
  if (t.bpm) L.push(`BPM: ${t.bpm}`);
  if (typeof t.gain === "number") L.push(`Gain: ${t.gain}`);
  if (t.rank) L.push(`Rank: ${t.rank}`);
  if (t.isrc) L.push(`ISRC: ${t.isrc}`);
  L.push(`Explicit: ${t.explicit_lyrics ? "ano" : "ne"}`);
  if (t.link) L.push(`Odkaz: ${t.link}`);
  if (t.preview) L.push(`Preview: ${t.preview}`);
  if (Array.isArray(t.available_countries)) L.push(`Dostupnost: ${t.available_countries.length} zemí`);
  return L.join("\n");
}
function nameOf(dir, slug, fallback) {
  return readEntityName(dir, slug) || fallback || slug;
}
function writeMdx(d) {
  const fm = [];
  fm.push(`title: ${yamlStr(d.title)}`);
  fm.push(`slug: ${yamlStr(d.slug)}`);
  fm.push(`rapper: ${yamlStr(d.primaryName)}`);
  fm.push(`rapperSlug: ${yamlStr(d.primarySlug)}`);
  fm.push(`features: ${yamlArr(d.featSlugs)}`);
  fm.push(`featuresNames: ${yamlArr(d.featNames)}`);
  if (d.albumTitle) fm.push(`album: ${yamlStr(d.albumTitle)}`);
  if (d.albumSlug) fm.push(`albumSlug: ${yamlStr(d.albumSlug)}`);
  if (d.year) fm.push(`year: ${d.year}`);
  fm.push(`genre: ${yamlArr(d.genreSlugs)}`);
  if (d.duration) fm.push(`duration: ${yamlStr(d.duration)}`);
  if (d.trackNumber != null) fm.push(`trackNumber: ${d.trackNumber}`);
  fm.push(`producers: []`);
  fm.push(`producersNames: []`);
  fm.push(`description: ${yamlStr(d.description)}`);
  fm.push(`publishedAt: ${yamlStr(d.today)}`);

  const body =
    `## Kontext\n\n_Stub — doplnit._\n`;

  const out = `---\n${fm.join("\n")}\n---\n\n${body}`;
  fs.mkdirSync(DIR.mdx, { recursive: true });
  fs.writeFileSync(path.join(DIR.mdx, `${d.slug}.mdx`), out, "utf8");
  console.log(`      + content/skladby/${d.slug}.mdx`);
}
function yamlStr(s) { return JSON.stringify(String(s ?? "")); }
function yamlArr(a) { return "[" + (a || []).map((x) => JSON.stringify(String(x))).join(", ") + "]"; }
function parseFeatures(title, contributors, primarySlug) {
  // všichni contributoři kromě primárního (Deezer dává u společných skladeb obě role "Main")
  const fromContrib = (contributors || [])
    .map((c) => c.name)
    .filter((n) => n && slugify(n) !== primarySlug);
  if (fromContrib.length) return { features: [...new Set(fromContrib)] };
  const m = String(title).match(/\((?:feat|ft|with)\.?\s+([^)]+)\)/i);
  if (!m) return { features: [] };
  return { features: m[1].split(/,|&|\band\b|\bx\b/i).map((s) => s.trim()).filter(Boolean) };
}
function nameFromContributors(dz) {
  return dz.contributors?.find((c) => c.role === "Main")?.name || dz.artist?.name || "";
}
function cleanTitle(t) { return String(t).replace(/\s*\((?:feat|ft|with)\.?[^)]*\)\s*$/i, "").trim(); }
function formatDuration(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }
function yearOf(date) { const y = parseInt(String(date || "").slice(0, 4), 10); return Number.isFinite(y) && y > 1900 ? y : null; }
function slugify(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function loadSlugSet(dir) {
  try { return new Set(fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => f.replace(/\.json$/, ""))); }
  catch { return new Set(); }
}
function normalizeAlbumTitle(t) {
  return String(t)
    .replace(/\s*[\(\[][^\)\]]*?(edition|edice|deluxe|reedice|remaster|version|anniversary)[^\)\]]*[\)\]]/ig, "")
    .replace(/\s*[-–—:]\s*(deluxe|reedice|remaster|anniversary)\b.*$/i, "")
    .trim();
}
function matchAlbumSlug(title) {
  const exact = slugify(title);
  if (ALBUM_SLUGS.has(exact)) return exact;
  const norm = slugify(normalizeAlbumTitle(title));
  if (ALBUM_SLUGS.has(norm)) return norm;
  // nejdelší existující slug, který je prefixem (řeší deluxe/edition varianty bez závorek)
  let best = null;
  for (const s of ALBUM_SLUGS) {
    if (norm === s || norm.startsWith(s + "-")) { if (!best || s.length > best.length) best = s; }
  }
  return best || norm;
}
function checkExists(dir, slug, warn, label) {
  if (slug && !fs.existsSync(path.join(dir, `${slug}.json`))) warn.push(`${label}: ${slug} není v ${path.basename(dir)}/`);
}
function readEntityName(dir, slug) {
  const f = path.join(dir, `${slug}.json`);
  if (!fs.existsSync(f)) return null;
  try { const j = JSON.parse(fs.readFileSync(f, "utf8")); return j.name || j.title || null; } catch { return null; }
}
function readGenres(rapperSlug) {
  const f = path.join(DIR.rappers, `${rapperSlug}.json`);
  if (!fs.existsSync(f)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    const g = j.genres || j.meta?.genres || [];
    return g.map((x) => (typeof x === "string" ? x : x.slug)).filter(Boolean);
  } catch { return []; }
}
function safeJson(s) {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}
async function jget(url) { const r = await fetch(url); if (!r.ok) throw new Error(`Deezer HTTP ${r.status}`); return r.json(); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) { const k = t.slice(2), n = argv[i + 1]; if (n && !n.startsWith("--")) { out[k] = n; i++; } else out[k] = true; }
  }
  return out;
}
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
function printHelp() {
  console.log(`create-track.mjs

  --rapper <slug> [--deep] [--albums-only] [--limit N] [--inherit-genres]
  --query "<dotaz>"
  --id <deezerId>
  --batch <soubor.txt>
  spol.: --dry-run --force --ai/--no-ai --name "..." --genres a,b`);
}
