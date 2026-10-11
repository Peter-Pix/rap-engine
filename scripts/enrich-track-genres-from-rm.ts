#!/usr/bin/env -S npx tsx
/**
 * FÁZE 3a — Žánry tracků z Rap Monitoru.
 *
 * Problém: 3 172 / 4 509 tracků nemá žánr. Dědit z alba nejde (alba žánry nemají).
 * RM ale vede `tags_genre` (auto-tagging) u 515 skladeb — 448 mapovatelných na track entity.
 *
 * Postup:
 *   1. Načte RM snapshot, vytáhne tags_genre (JSON array v stringu)
 *   2. Namapuje skladbu → track entitu podle titulu
 *   3. Převede žánr na existující `genre_*` entitu (case-insensitive)
 *   4. Odfiltruje šum (interpreti místo žánrů: "Eminem", "955 WKQI", roky, "english"…)
 *   5. Zapíše `genres` array do track relations.json (merge, idempotentní)
 *
 * Bezpečnost: DRY_RUN default, zapisuje jen existující genre entity.
 *
 * Použití:
 *   npx tsx scripts/enrich-track-genres-from-rm.ts
 *   DRY_RUN=0 npx tsx scripts/enrich-track-genres-from-rm.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const RM = path.join(ROOT, ".data", "phase3", "rm-songs.json");
const DRY_RUN = process.env.DRY_RUN !== "0";

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Aliasy RM tagů → kanonický název existující genre entity. */
const TAG_ALIASES: Record<string, string> = {
  "old school": "old school rap",
  "lo fi": "lo-fi rap",
};

/** Šum z auto-taggingu — nejsou to žánry, do DB nepatří. */
const NOISE = new Set([
  "eminem","dido","mockingbird","955 wkqi","00s","90s","2020","2024","english","angry","sexy","love",
  "soundtrack","alt-rap","alternative pop","afrobeat","funk","lo-fi","fast rap","2000s","2010s",
]);

// ── Index ──────────────────────────────────────────────────────────────────
const genreByKey = new Map<string, string>();
for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("genre_")) continue;
  const mp = path.join(ENTITIES, d, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  for (const k of [m.title, m.slug, d.replace(/^genre_/, "").replace(/-/g, " ")]) {
    if (k) { const n = norm(String(k)); if (!genreByKey.has(n)) genreByKey.set(n, m.id); }
  }
}
const trackByTitle = new Map<string, string>();
for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("track_")) continue;
  const mp = path.join(ENTITIES, d, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  if (m.title) trackByTitle.set(norm(m.title), m.id);
}

// ── Projdi RM ──────────────────────────────────────────────────────────────
const rm: any[] = JSON.parse(fs.readFileSync(RM, "utf8"));
const planned: { trackId: string; genres: string[] }[] = [];
const unresolvedTags = new Map<string, number>();
let noTrack = 0;

for (const s of rm) {
  const raw = s.tags_genre;
  if (!raw) continue;
  let tags: string[] = [];
  try { tags = typeof raw === "string" ? JSON.parse(raw.replace(/'/g, '"')) : raw; } catch { continue; }
  if (!Array.isArray(tags)) continue;

  const trackId = trackByTitle.get(norm(String(s.title ?? "")));
  if (!trackId) { noTrack++; continue; }

  const resolved: string[] = [];
  for (const t of tags) {
    const n = norm(String(t));
    if (!n || NOISE.has(n)) continue;
    const g = genreByKey.get(norm(TAG_ALIASES[n] ?? n));
    if (g) resolved.push(g);
    else unresolvedTags.set(String(t), (unresolvedTags.get(String(t)) ?? 0) + 1);
  }
  if (resolved.length) planned.push({ trackId, genres: [...new Set(resolved)] });
}

// ── Zápis ──────────────────────────────────────────────────────────────────
let written = 0, edges = 0, skipped = 0;
for (const p of planned) {
  const rp = path.join(ENTITIES, p.trackId, "relations.json");
  if (!fs.existsSync(rp)) continue;
  const rel = JSON.parse(fs.readFileSync(rp, "utf8"));
  const cur: string[] = rel.genres ?? [];
  const add = p.genres.filter((x) => !cur.includes(x));
  if (!add.length) { skipped++; continue; }
  if (!DRY_RUN) { rel.genres = [...cur, ...add]; fs.writeFileSync(rp, JSON.stringify(rel, null, 2) + "\n"); }
  written++; edges += add.length;
}

console.log(`RM skladeb s tags_genre: ${rm.filter((s) => s.tags_genre).length}`);
console.log(`  — bez mapování na track: ${noTrack}`);
console.log(`  — tracků k obohacení: ${written} (nových hran: ${edges}, už mělo: ${skipped})`);
if (unresolvedTags.size) {
  console.log(`\n⚠️ Nerozpoznané tagy (${unresolvedTags.size}):`);
  for (const [t, c] of [...unresolvedTags].sort((a, b) => b[1] - a[1])) console.log(`   ${t} (${c})`);
}
console.log(DRY_RUN ? "\n[DRY-RUN] Nic nezapsáno." : `\n✅ Zapsáno ${edges} HAS_GENRE hran do ${written} tracků.`);
