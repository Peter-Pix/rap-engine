#!/usr/bin/env node
/**
 * enrich-tracks.mjs — dotěží data/tracks/*.json z uloženého _deezer.raw (BEZ volání Deezeru)
 *
 * Doplní do meta: duration, deezerId, isrc, rank, explicit, cover, previewUrl, bpm(>0)
 * Opraví features: všichni contributoři kromě primárního umělce (řeší P T K = "Main").
 *
 *   node scripts/enrich-tracks.mjs --dry-run        # ukáže změny, nic nezapíše
 *   node scripts/enrich-tracks.mjs                  # zapíše
 *   node scripts/enrich-tracks.mjs --refresh-features  # přepíše i neprázdné features
 *   node scripts/enrich-tracks.mjs --trim-countries    # available_countries -> jen počet (zmenší soubory)
 *
 * Idempotentní. Pozn.: previewUrl z Deezeru je PODEPSANÝ a VYPRŠÍ — viz poznámka v chatu.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR_TRACKS = path.join(ROOT, "data", "tracks");

const DRY = process.argv.includes("--dry-run");
const REFRESH_FEATURES = process.argv.includes("--refresh-features");
const TRIM_COUNTRIES = process.argv.includes("--trim-countries");

let changed = 0, skipped = 0, bad = 0;

const files = fs.existsSync(DIR_TRACKS)
  ? fs.readdirSync(DIR_TRACKS).filter((f) => f.endsWith(".json") && !f.startsWith("_")) : [];
console.log(`Tracků: ${files.length}`);

for (const f of files) {
  const p = path.join(DIR_TRACKS, f);
  let t;
  try { t = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.log(`  ✖ VADNÝ JSON: ${f} — ${e.message}`); bad++; continue; }   // najde rozbitý soubor mezi 700

  const r = t._deezer?.raw;
  if (!r) { skipped++; continue; }
  t.meta = t.meta || {};
  let touched = false;
  const set = (k, v) => { if (v != null && t.meta[k] !== v) { t.meta[k] = v; touched = true; } };

  if (!t.meta.duration && r.duration) set("duration", fmt(r.duration));
  set("deezerId", r.id);
  set("isrc", r.isrc || null);
  set("rank", typeof r.rank === "number" ? r.rank : null);
  set("explicit", !!r.explicit_lyrics);
  set("cover", r.album?.cover_xl || r.album?.cover_big || null);
  set("previewUrl", r.preview || null);
  if (r.bpm && r.bpm > 0) set("bpm", Math.round(r.bpm));

  // features = contributoři kromě primárního (bez ohledu na Main/Featured)
  const primary = t.meta.primaryArtist?.slug;
  const contribs = (r.contributors || []).map((c) => ({ name: c.name, slug: slugify(c.name) }))
    .filter((c) => c.slug && c.slug !== primary);
  const dedup = [...new Map(contribs.map((c) => [c.slug, c])).values()];
  const hasFeatures = Array.isArray(t.meta.features) && t.meta.features.length > 0;
  if (dedup.length && (REFRESH_FEATURES || !hasFeatures)) {
    const next = dedup.map((c) => ({ kind: "rapper", slug: c.slug }));
    if (JSON.stringify(next) !== JSON.stringify(t.meta.features)) { t.meta.features = next; touched = true; }
  }

  if (TRIM_COUNTRIES && Array.isArray(r.available_countries)) {
    t._deezer.raw.availableCountriesCount = r.available_countries.length;
    delete t._deezer.raw.available_countries;
    touched = true;
  }

  if (touched) {
    changed++;
    if (!DRY) fs.writeFileSync(p, JSON.stringify(t, null, 2) + "\n", "utf8");
    else console.log(`  ~ ${f}: duration=${t.meta.duration} cover=${t.meta.cover ? "✓" : "—"} preview=${t.meta.previewUrl ? "✓" : "—"} features=${(t.meta.features || []).map((x) => x.slug).join(",") || "—"}`);
  }
}

console.log(`\n${DRY ? "[dry-run] " : ""}Změněno: ${changed}, beze změny: ${skipped}, vadných: ${bad}.`);
if (bad) console.log("⚠ Vadné JSONy oprav — pravděpodobná příčina mizejících skladeb.");

function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }
function slugify(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
