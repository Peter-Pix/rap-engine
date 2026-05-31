#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// 4RAP — Extract edges (self-contained, žádné lib/ dependencies)
//
// Čte data/<kind>/*.json a vytahuje typované hrany do data/edges/<type>.json.
//
//   rapper.meta.primaryLabel   → SIGNED_TO    (rapper → label)
//   rapper.meta.genres[]       → BELONGS_TO_GENRE
//   album.meta.artist          → CREATED      (rapper → album)
//   album.meta.label           → RELEASED_ON
//   album.meta.genres[]        → BELONGS_TO_GENRE
//   album.meta.features[]      → FEATURED_ON  (rapper → album)
//   track.meta.primaryArtist   → CREATED      (rapper → track)
//   track.meta.features[]      → FEATURED_ON  + implicit COLLABORATED
//   track.meta.album           → PART_OF_ALBUM
//   track.meta.producers[]     → PRODUCED
//   track.meta.genres[]        → BELONGS_TO_GENRE
//   label.meta.currentRoster[] → SIGNED_TO    (fallback)
//   label.meta.city            → FROM_CITY
//
//   + legacy: content/raperi/<slug>.mdx → relatedRappers[] → COLLABORATED (w 0.5)
//
//   node scripts/extract-edges.mjs
//   node scripts/extract-edges.mjs --dry-run
// ═══════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const DATA_DIR = join(ROOT, "data");
const EDGES_DIR = join(DATA_DIR, "edges");
const CONTENT_DIR = join(ROOT, "content");
const DRY_RUN = process.argv.includes("--dry-run");

const SYMMETRIC = new Set(["COLLABORATED", "BEEF_WITH"]);

// ── EdgeSet (dedup + symmetric kanonizace) ──
class EdgeSet {
  constructor() { this.byType = new Map(); this.seen = new Set(); }
  add(e) {
    if (!e.from?.slug || !e.to?.slug) return;
    if (e.from.slug === e.to.slug && e.from.kind === e.to.kind) return;
    const key = SYMMETRIC.has(e.type) ? symKey(e) : `${e.type}|${e.from.kind}:${e.from.slug}|${e.to.kind}:${e.to.slug}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    if (!this.byType.has(e.type)) this.byType.set(e.type, []);
    this.byType.get(e.type).push(e);
  }
  count() { let n = 0; for (const a of this.byType.values()) n += a.length; return n; }
}
function symKey(e) {
  const a = `${e.from.kind}:${e.from.slug}`, b = `${e.to.kind}:${e.to.slug}`;
  const [x, y] = [a, b].sort();
  return `${e.type}|${x}|${y}`;
}

// ── load ──
function loadKind(name) {
  const d = join(DATA_DIR, name);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => { try { return JSON.parse(readFileSync(join(d, f), "utf8")); } catch { return null; } })
    .filter(Boolean);
}

// ── extraktory ──
function fromRappers(arr, E) {
  for (const r of arr) {
    const me = { kind: "rapper", slug: r.slug };
    if (r.meta?.primaryLabel) E.add({ from: me, to: r.meta.primaryLabel, type: "SIGNED_TO", weight: 0.9 });
    for (const g of r.meta?.genres || []) E.add({ from: me, to: g, type: "BELONGS_TO_GENRE", weight: 0.7 });
  }
}
function fromAlbums(arr, E) {
  for (const a of arr) {
    const me = { kind: "album", slug: a.slug };
    const since = a.meta?.year != null ? String(a.meta.year) : undefined;
    if (a.meta?.artist) E.add({ from: a.meta.artist, to: me, type: "CREATED", weight: 1, ...(since && { since }) });
    if (a.meta?.label) E.add({ from: me, to: a.meta.label, type: "RELEASED_ON", weight: 0.9, ...(since && { since }) });
    for (const g of a.meta?.genres || []) E.add({ from: me, to: g, type: "BELONGS_TO_GENRE", weight: 0.7 });
    for (const f of a.meta?.features || []) E.add({ from: f, to: me, type: "FEATURED_ON", weight: 0.8 });
  }
}
function fromTracks(arr, E) {
  for (const t of arr) {
    const me = { kind: "track", slug: t.slug };
    const since = t.meta?.year != null ? String(t.meta.year) : undefined;
    if (t.meta?.primaryArtist) E.add({ from: t.meta.primaryArtist, to: me, type: "CREATED", weight: 1, ...(since && { since }) });
    for (const f of t.meta?.features || []) {
      E.add({ from: f, to: me, type: "FEATURED_ON", weight: 0.8 });
      if (t.meta?.primaryArtist) E.add({ from: t.meta.primaryArtist, to: f, type: "COLLABORATED", weight: 0.7, ...(since && { since }), note: `track: ${t.title}` });
    }
    if (t.meta?.album) E.add({ from: me, to: t.meta.album, type: "PART_OF_ALBUM", weight: 1 });
    for (const p of t.meta?.producers || []) E.add({ from: p, to: me, type: "PRODUCED", weight: 0.9 });
    for (const g of t.meta?.genres || []) E.add({ from: me, to: g, type: "BELONGS_TO_GENRE", weight: 0.6 });
  }
}
function fromLabels(arr, E) {
  for (const l of arr) {
    const me = { kind: "label", slug: l.slug };
    if (l.meta?.city) E.add({ from: me, to: l.meta.city, type: "FROM_CITY", weight: 0.9 });
    for (const r of l.meta?.currentRoster || []) E.add({ from: r, to: me, type: "SIGNED_TO", weight: 0.9 });
  }
}

// ── legacy: relatedRappers z MDX (inline frontmatter parser) ──
function fromLegacyMdx(E) {
  const dir = join(CONTENT_DIR, "raperi");
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
    const raw = readFileSync(join(dir, f), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;
    const fm = m[1];
    const slug = (fm.match(/^slug:\s*["']?([^"'\r\n]+)["']?\s*$/m) || [])[1];
    if (!slug) continue;
    const rel = fm.match(/^relatedRappers:\s*\r?\n((?:\s*-\s*["']?[^"'\r\n]+["']?\r?\n?)+)/m);
    if (!rel) continue;
    const slugs = [...rel[1].matchAll(/^\s*-\s*["']?([^"'\r\n]+)["']?/gm)].map((x) => x[1].trim()).filter(Boolean);
    const me = { kind: "rapper", slug };
    for (const other of slugs) E.add({ from: me, to: { kind: "rapper", slug: other }, type: "COLLABORATED", weight: 0.5, source: "legacy: relatedRappers" });
  }
}

// ── main ──
function main() {
  const E = new EdgeSet();
  const rappers = loadKind("rappers"), albums = loadKind("albums"), tracks = loadKind("tracks"), labels = loadKind("labels");
  console.log(`→ ${rappers.length} rapperů, ${albums.length} alb, ${tracks.length} skladeb, ${labels.length} labelů`);

  fromRappers(rappers, E); fromAlbums(albums, E); fromTracks(tracks, E); fromLabels(labels, E); fromLegacyMdx(E);
  console.log(`✓ ${E.count()} unikátních hran (${E.byType.size} typů)`);

  if (DRY_RUN) { for (const [t, l] of E.byType) console.log(`  [dry] ${t}: ${l.length}`); return; }
  if (!existsSync(EDGES_DIR)) mkdirSync(EDGES_DIR, { recursive: true });
  for (const [type, list] of E.byType) {
    writeFileSync(join(EDGES_DIR, type.toLowerCase() + ".json"),
      JSON.stringify({ type, symmetric: SYMMETRIC.has(type), count: list.length, edges: list }, null, 2) + "\n", "utf8");
    console.log(`  edges/${type.toLowerCase()}.json: ${list.length}`);
  }
  writeFileSync(join(EDGES_DIR, "_index.json"),
    JSON.stringify({ generated: new Date().toISOString(), total: E.count(), byType: Object.fromEntries([...E.byType].map(([k, v]) => [k, v.length])) }, null, 2) + "\n", "utf8");
}
main();
