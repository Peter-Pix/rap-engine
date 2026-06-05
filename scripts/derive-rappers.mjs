#!/usr/bin/env node
/**
 * derive-rappers.mjs — dogeneruje rapper stuby pro CHYBĚJÍCÍ featuringy z Deezer dat.
 *
 * Zdroj: _deezer.raw.contributors + .artist napříč data/tracks/*.json
 *  - existující umělce NAUČÍ do mapy (data/maps/deezer-artists.json → byId)
 *  - chybějící → stub data/rappers/<slug>.json (schéma jako nik-tendo)
 *
 * CZ/SK-ONLY: národnost z Deezeru nejde. Workflow:
 *   1) node scripts/derive-rappers.mjs                 # REPORT (nic nezapíše)
 *   2) zahraniční ID dej do data/maps/deezer-artists.json → "exclude": [ ... ]
 *   3) node scripts/derive-rappers.mjs --write         # vytvoří stuby (mimo exclude)
 *
 * FLAGY:
 *   --write                 zapiš stuby + mapu
 *   --min-refs N            jen umělci s ≥N výskyty (default 1)
 *   --exclude-non-primary   heuristika: vynech ty, co nikdy nejsou primaryArtist (spíš hosté)
 *
 * Po doběhnutí: node scripts/normalize-tracks.mjs --write && node scripts/extract-edges.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR = {
  tracks: path.join(ROOT, "data", "tracks"),
  rappers: path.join(ROOT, "data", "rappers"),
  maps: path.join(ROOT, "data", "maps"),
};
const MAP_FILE = path.join(DIR.maps, "deezer-artists.json");
const WRITE = process.argv.includes("--write");
const EXCLUDE_NON_PRIMARY = process.argv.includes("--exclude-non-primary");
const MIN_REFS = (() => { const i = process.argv.indexOf("--min-refs"); return i >= 0 ? parseInt(process.argv[i + 1], 10) || 1 : 1; })();

const RAPPER_SLUGS = slugSet(DIR.rappers);
const ALIAS = buildAliasMap();
const MAP = loadMap();
const EXCLUDE = new Set((MAP.exclude || []).map(String));

// id → { name, image, link, count, isPrimary }
const artists = new Map();

main();

function main() {
  for (const f of listJson(DIR.tracks)) {
    let t; try { t = JSON.parse(fs.readFileSync(path.join(DIR.tracks, f), "utf8")); } catch { continue; }
    const r = t._deezer?.raw; if (!r) continue;
    const primaryId = r.artist?.id != null ? String(r.artist.id) : null;
    for (const c of r.contributors || []) {
      if (c.id == null) continue;
      const id = String(c.id);
      const a = artists.get(id) || { name: c.name, image: c.picture_xl || c.picture_big || null, link: c.link || null, count: 0, isPrimary: false };
      a.count++;
      if (id === primaryId) a.isPrimary = true;
      artists.set(id, a);
    }
  }

  const learn = [];       // existující – jen do mapy
  const missing = [];     // chybějící – ke stubu
  const excluded = [];

  for (const [id, a] of artists) {
    const canonical = MAP.byId?.[id] || resolveByName(a.name);
    if (canonical && RAPPER_SLUGS.has(canonical)) { if (MAP.byId?.[id] !== canonical) learn.push([id, canonical]); continue; }
    if (EXCLUDE.has(id)) { excluded.push([id, a]); continue; }
    if (a.count < MIN_REFS) continue;
    if (EXCLUDE_NON_PRIMARY && !a.isPrimary) { excluded.push([id, a]); continue; }
    const slug = canonical || slugify(a.name);
    missing.push({ id, slug, ...a });
  }

  missing.sort((x, y) => y.count - x.count);

  // ── zápis ──
  MAP.byId = MAP.byId || {};
  for (const [id, slug] of learn) MAP.byId[id] = slug;

  let created = 0;
  for (const m of missing) {
    if (MAP.byId[m.id] && RAPPER_SLUGS.has(MAP.byId[m.id])) continue;
    MAP.byId[m.id] = m.slug;
    created++;
    if (WRITE) {
      fs.mkdirSync(DIR.rappers, { recursive: true });
      const file = path.join(DIR.rappers, `${m.slug}.json`);
      if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(buildRapperStub(m), null, 2) + "\n", "utf8");
    }
  }
  if (WRITE) { fs.mkdirSync(DIR.maps, { recursive: true }); fs.writeFileSync(MAP_FILE, JSON.stringify(MAP, null, 2) + "\n", "utf8"); }

  // ── report ──
  console.log(`Unikátních umělců v datech: ${artists.size}`);
  console.log(`  existujících (naučeno do mapy): ${learn.length}`);
  console.log(`  ${WRITE ? "vytvořeno" : "k vytvoření"} stubů: ${created}  (min-refs ${MIN_REFS}${EXCLUDE_NON_PRIMARY ? ", bez hostů" : ""})`);
  console.log(`  v exclude: ${excluded.length}\n`);

  console.log(`Chybějící umělci (zkontroluj — CZ/SK only; zahraniční dej do exclude):`);
  for (const m of missing.slice(0, 60)) {
    console.log(`  ${String(m.count).padStart(3)}×  "${m.id}"  ${m.name}  →  ${m.slug}${m.isPrimary ? "  [je i primary]" : ""}`);
  }
  if (!WRITE) console.log(`\nNic nezapsáno. Po revizi spusť s --write.`);
  else console.log(`\n✓ Zapsáno. Dál: node scripts/normalize-tracks.mjs --write  &&  node scripts/extract-edges.mjs`);
}

function buildRapperStub(m) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `rapper_${m.slug}`,
    kind: "rapper",
    slug: m.slug,
    title: m.name,
    aliases: [],
    summary: "",
    status: "stub",
    createdAt: today,
    updatedAt: today,
    meta: {
      realName: "",
      genres: [],
      socials: {},
      deezerId: Number(m.id),
      image: m.image || null,
    },
    significance: { why: "", whatChanged: "", context: "", distinguishing: "", oneLiner: "" },
    timeline: [],
    quotes: [],
    faq: [],
    hasLongform: false,
    seo: { noindex: true },
  };
}

// ── helpers ──
function resolveByName(name) {
  if (!name) return null;
  const s = slugify(name); if (RAPPER_SLUGS.has(s)) return s; if (ALIAS.has(s)) return ALIAS.get(s);
  const d = despace(name); if (ALIAS.has(d)) return ALIAS.get(d);
  return null;
}
function buildAliasMap() {
  const map = new Map();
  const put = (k, slug) => { if (k && !map.has(k)) map.set(k, slug); };
  for (const f of listJson(DIR.rappers)) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(DIR.rappers, f), "utf8")); } catch { continue; }
    const slug = j.slug || f.replace(/\.json$/, "");
    for (const v of [slug, j.title, j.name, j.meta?.realName, ...(j.aliases || [])]) { if (!v) continue; put(slugify(v), slug); put(despace(v), slug); }
  }
  return map;
}
function loadMap() { if (fs.existsSync(MAP_FILE)) { try { const m = JSON.parse(fs.readFileSync(MAP_FILE, "utf8")); m.byId = m.byId || {}; return m; } catch {} } return { byId: {}, exclude: [], unresolved: {} }; }
function listJson(dir) { try { return fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")); } catch { return []; } }
function slugSet(dir) { return new Set(listJson(dir).map((f) => f.replace(/\.json$/, ""))); }
function slugify(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function despace(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
