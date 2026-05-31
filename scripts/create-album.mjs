#!/usr/bin/env node
/**
 * create-album.mjs — z Deezer album URL/ID vytvoří album entitu + všechny její skladby.
 *
 *   data/albums/<slug>.json     (graf: meta.artist/label/year/genres + _deezer.raw)
 *   content/alba/<slug>.mdx      (stránka; rapperSlug → album se ukáže u rapera)
 *   + pro každou skladbu zavolá create-track.mjs --id <id> --artist <albumArtist>
 *
 *   node scripts/create-album.mjs https://www.deezer.com/cs/album/911158401
 *   node scripts/create-album.mjs 911158401 --no-tracks      # jen album
 *   node scripts/create-album.mjs 911158401 --dry-run        # nic nezapíše
 *   flagy: --force  --no-tracks  --no-ai (pro tracky)  --dry-run
 *
 * Po doběhnutí: node scripts/normalize-tracks.mjs --write && node scripts/extract-edges.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR = {
  albums: path.join(ROOT, "data", "albums"),
  rappers: path.join(ROOT, "data", "rappers"),
  labels: path.join(ROOT, "data", "labels"),
  genres: path.join(ROOT, "data", "genres"),
  maps: path.join(ROOT, "data", "maps"),
  mdx: path.join(ROOT, "content", "alba"),
};
const CREATE_TRACK = path.join(__dirname, "create-track.mjs");

const argv = process.argv.slice(2);
const FLAGS = {
  force: argv.includes("--force"),
  noTracks: argv.includes("--no-tracks"),
  noAi: argv.includes("--no-ai"),
  dryRun: argv.includes("--dry-run"),
};
const input = argv.find((a) => !a.startsWith("--"));

const ALBUM_SLUGS = slugSet(DIR.albums);
const LABEL_SLUGS = slugSet(DIR.labels);
const GENRE_SLUGS = slugSet(DIR.genres);
const RAPPER_SLUGS = slugSet(DIR.rappers);
const ALIAS = buildAliasMap();
const MAP = loadMap();

main().catch((e) => { console.error("✖", e.message); process.exit(1); });

async function main() {
  const id = parseAlbumId(input);
  if (!id) { console.log("Použití: node scripts/create-album.mjs <deezer-album-url-nebo-id> [--no-tracks --dry-run --force --no-ai]"); return; }

  const a = await jget(`https://api.deezer.com/album/${id}`);
  if (a.error) throw new Error(`Deezer: ${a.error.message || "album nenalezeno"}`);

  const slug = matchAlbumSlug(a.title);
  const year = yearOf(a.release_date);
  const artistSlug = resolveArtist(a.artist?.id, a.artist?.name) || slugify(a.artist?.name || "");
  const artistName = a.artist?.name || artistSlug;
  const labelSlug = a.label && LABEL_SLUGS.has(slugify(a.label)) ? slugify(a.label) : null;
  const genres = (a.genres?.data || []).map((g) => slugify(g.name)).filter((s) => GENRE_SLUGS.has(s));

  console.log(`Album: "${a.title}" — ${artistName} (${year ?? "?"}, ${a.nb_tracks} skl.)  → slug ${slug}`);
  if (!RAPPER_SLUGS.has(artistSlug)) console.log(`  ⚠ rapper "${artistSlug}" není v data/rappers — album se neukáže u rapera, dokud ho nedoplníš`);
  if (a.label && !labelSlug) console.log(`  ⚠ label "${a.label}" (distributor?) nemá entitu — uložím jen název, bez RELEASED_ON`);

  const today = new Date().toISOString().slice(0, 10);
  const albumJson = {
    id: `album_${slug}`, kind: "album", slug, title: a.title, aliases: [], summary: "", status: "stub",
    createdAt: today, updatedAt: today,
    meta: {
      artist: artistSlug ? { kind: "rapper", slug: artistSlug } : null,
      label: labelSlug ? { kind: "label", slug: labelSlug } : null,
      labelName: a.label || null,
      year, genres: genres.map((s) => ({ kind: "genre", slug: s })), features: [],
      cover: a.cover_xl || a.cover_big || null, upc: a.upc || null,
      nbTracks: a.nb_tracks || null, deezerAlbumId: a.id, recordType: a.record_type || null,
    },
    significance: { why: "", whatChanged: "", context: "", distinguishing: "", oneLiner: "" },
    timeline: [], quotes: [], faq: [], hasLongform: false, seo: { noindex: true },
    _deezer: { fetchedAt: new Date().toISOString(), source: `https://api.deezer.com/album/${a.id}`, raw: a },
  };

  const description = `${a.title} — ${a.record_type === "single" ? "singl" : a.record_type === "ep" ? "EP" : "album"} od ${artistName}${year ? ` (${year})` : ""}.`;
  const mdx = buildAlbumMdx({ title: a.title, slug, rapperSlug: artistSlug, year, genres, description, today, cover: albumJson.meta.cover });

  if (FLAGS.dryRun) {
    console.log("--dry-run, album JSON meta:\n" + JSON.stringify(albumJson.meta, null, 2));
    console.log(`\nMDX:\n${mdx}`);
    if (!FLAGS.noTracks) {
      console.log(`\nSpustil bych pro ${(a.tracks?.data || []).length} skladeb:`);
      for (const t of (a.tracks?.data || []).slice(0, 3)) console.log(`  create-track --id ${t.id} --artist ${artistSlug} --force`);
      console.log("  …");
    }
    return;
  }

  // zápis album entity (JSON + MDX) PŘED tracky — ať create-track napojí album přesně
  fs.mkdirSync(DIR.albums, { recursive: true });
  const albumFile = path.join(DIR.albums, `${slug}.json`);
  if (!fs.existsSync(albumFile) || FLAGS.force) fs.writeFileSync(albumFile, JSON.stringify(albumJson, null, 2) + "\n", "utf8");
  fs.mkdirSync(DIR.mdx, { recursive: true });
  const mdxFile = path.join(DIR.mdx, `${slug}.mdx`);
  if (!fs.existsSync(mdxFile) || FLAGS.force) fs.writeFileSync(mdxFile, mdx, "utf8");
  ALBUM_SLUGS.add(slug);
  console.log(`  ✓ data/albums/${slug}.json + content/alba/${slug}.mdx`);

  // skladby přes create-track.mjs
  if (!FLAGS.noTracks) {
    const tracks = a.tracks?.data || [];
    console.log(`  → ${tracks.length} skladeb přes create-track.mjs`);
    for (const t of tracks) {
      const args = ["--id", String(t.id), "--artist", artistSlug, "--force"];
      if (FLAGS.noAi) args.push("--no-ai");
      const r = spawnSync("node", [CREATE_TRACK, ...args], { stdio: "inherit" });
      if (r.status !== 0) console.log(`    ⚠ create-track selhalo pro id ${t.id}`);
    }
  }

  console.log(`\n✓ Hotovo. Dál: node scripts/normalize-tracks.mjs --write && node scripts/extract-edges.mjs`);
}

function buildAlbumMdx(d) {
  const fm = [
    `title: ${JSON.stringify(d.title)}`,
    `slug: ${JSON.stringify(d.slug)}`,
    `rapperSlug: ${JSON.stringify(d.rapperSlug)}`,
    ...(d.year ? [`year: ${d.year}`] : []),                         // ČÍSLO, ne string
    `genre: [${d.genres.map((g) => JSON.stringify(g)).join(", ")}]`,
    ...(d.cover ? [`image: ${JSON.stringify(d.cover)}`] : []),
    `description: ${JSON.stringify(d.description)}`,
    `publishedAt: ${JSON.stringify(d.today)}`,
  ];
  return `---\n${fm.join("\n")}\n---\n\n## O albu\n\n_Stub — doplnit._\n`;
}

// ── resolvery / helpers ──
function parseAlbumId(s) {
  if (!s) return null;
  const m = String(s).match(/album\/(\d+)/) || String(s).match(/^(\d+)$/);
  return m ? m[1] : null;
}
function resolveArtist(id, name) {
  if (id != null && MAP.byId?.[String(id)]) return MAP.byId[String(id)];
  if (!name) return null;
  const s = slugify(name); if (RAPPER_SLUGS.has(s)) return s; if (ALIAS.has(s)) return ALIAS.get(s);
  const d = despace(name); if (ALIAS.has(d)) return ALIAS.get(d);
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
function buildAliasMap() {
  const map = new Map(); const put = (k, slug) => { if (k && !map.has(k)) map.set(k, slug); };
  for (const f of listJson(DIR.rappers)) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(DIR.rappers, f), "utf8")); } catch { continue; }
    const slug = j.slug || f.replace(/\.json$/, "");
    for (const v of [slug, j.title, j.name, j.meta?.realName, ...(j.aliases || [])]) { if (!v) continue; put(slugify(v), slug); put(despace(v), slug); }
  }
  return map;
}
function loadMap() { if (fs.existsSync(path.join(DIR.maps, "deezer-artists.json"))) { try { const m = JSON.parse(fs.readFileSync(path.join(DIR.maps, "deezer-artists.json"), "utf8")); m.byId = m.byId || {}; return m; } catch {} } return { byId: {} }; }
function listJson(dir) { try { return fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")); } catch { return []; } }
function slugSet(dir) { return new Set(listJson(dir).map((f) => f.replace(/\.json$/, ""))); }
function slugify(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function despace(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function normalizeAlbumTitle(t) { return String(t).replace(/\s*[\(\[][^\)\]]*?(edition|edice|deluxe|reedice|remaster|version|anniversary)[^\)\]]*[\)\]]/ig, "").replace(/\s*[-–—:]\s*(deluxe|reedice|remaster|anniversary)\b.*$/i, "").trim(); }
function yearOf(d) { const y = parseInt(String(d || "").slice(0, 4), 10); return Number.isFinite(y) && y > 1900 ? y : null; }
async function jget(url) { const r = await fetch(url); if (!r.ok) throw new Error(`Deezer HTTP ${r.status}`); return r.json(); }
