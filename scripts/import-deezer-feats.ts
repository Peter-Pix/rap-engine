#!/usr/bin/env -S npx tsx
/**
 * Import feat vazeb z Deezer tracklistů do relations.json.
 *
 * Zdroj: content/entities/album_*\/tracks.json (Deezer tracklist s polem `feat`).
 * Cíl:   content/entities/track_*\/relations.json → klíč `featuring`.
 *
 * Pravidla:
 *  - Zapisují se POUZE feat jména, která matchují existující RKG artista.
 *  - Neznámá jména (zahraničí, chybějící entity) se reportují, ale NEZAPISUJÍ.
 *  - Feat jména se čistí (artefakty závorek, "feat." prefixy).
 *  - Idempotentní: existující vazby se neduplikují.
 *  - DRY_RUN default; zápis jen s DRY_RUN=0.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY = process.env.DRY_RUN !== "0";

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Vyčisti feat jméno od artefaktů parseru. */
function cleanFeatName(raw: string): string {
  let s = (raw || "").trim();
  // rozbité závorky a uvozovky
  s = s.replace(/^[\(\[\{"'“”]+/, "").replace(/[\)\]\}"'“”]+$/, "").trim();
  // duplicitní závěrky uprostřed ("Fuckstroy)")
  s = s.replace(/\)+$/, "").trim();
  // "feat." prefixy
  s = s.replace(/^(?:feat\.?|ft\.?|featuring|with)\s+/i, "").trim();
  return s;
}

// ── Indexy ────────────────────────────────────────────────────────────────
const artistByName = new Map<string, string>();
const artistIdSet = new Set<string>();

for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("artist_")) continue;
  const mp = path.join(ENTITIES, d, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  artistIdSet.add(m.id);
  for (const key of [norm(m.title), norm(d.replace(/^artist_/, "")), norm(m.slug ?? "")]) {
    if (key && !artistByName.has(key)) artistByName.set(key, m.id);
  }
}

const deezerIdToTrack = new Map<string, string>();
const trackDirByTrackId = new Map<string, string>();
for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("track_")) continue;
  const mp = path.join(ENTITIES, d, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  trackDirByTrackId.set(m.id, d);
  for (const s of (m.extraMeta?.sources ?? []) as string[]) {
    const dm = s.match(/deezer\.com\/track\/(\d+)/);
    if (dm) deezerIdToTrack.set(dm[1], m.id);
  }
}

console.log(`RKG artistů: ${artistIdSet.size} | track entit: ${trackDirByTrackId.size}`);
console.log(`Track entit s deezer ID: ${deezerIdToTrack.size}\n`);

// ── Sběr ───────────────────────────────────────────────────────────────────
interface Plan { trackId: string; dir: string; feats: string[]; title: string }
const plan = new Map<string, Plan>();
const unknown = new Map<string, number>();
let entriesWithFeat = 0, matched = 0, unmatchedEntries = 0;

for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("album_")) continue;
  const tp = path.join(ENTITIES, d, "tracks.json");
  if (!fs.existsSync(tp)) continue;
  const j = JSON.parse(fs.readFileSync(tp, "utf8"));
  for (const t of (j.tracks ?? []) as any[]) {
    if (!t.feat?.length) continue;
    entriesWithFeat++;
    const deezerId = (t.link ?? "").match(/deezer\.com\/track\/(\d+)/)?.[1];
    const trackId = deezerId ? deezerIdToTrack.get(deezerId) : undefined;
    if (!trackId) { unmatchedEntries++; continue; }
    const featIds: string[] = [];
    for (const raw of t.feat as string[]) {
      const name = cleanFeatName(raw);
      if (!name) continue;
      const id = artistByName.get(norm(name));
      if (id) featIds.push(id);
      else unknown.set(name, (unknown.get(name) ?? 0) + 1);
    }
    if (!featIds.length) continue;
    matched++;
    const prev = plan.get(trackId);
    const uniq = [...new Set([...(prev?.feats ?? []), ...featIds])];
    plan.set(trackId, { trackId, dir: trackDirByTrackId.get(trackId)!, feats: uniq, title: t.title });
  }
}

console.log(`── Deezer ────────────────────────────`);
console.log(`skladeb s feat:          ${entriesWithFeat}`);
console.log(`spárováno (track+feat):  ${matched}`);
console.log(`nepárováno (track chybí): ${unmatchedEntries}`);
console.log(`\n── Plán zápisu ───────────────────────`);
console.log(`track entit k obohacení: ${plan.size}`);
console.log(`celkem feat vazeb:       ${[...plan.values()].reduce((a, p) => a + p.feats.length, 0)}`);
console.log(`\n── Neznámá jména (neimportuje se) ────`);
console.log(`unikátních: ${unknown.size}`);
for (const [n, c] of [...unknown.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`  ${String(c).padStart(2)}×  ${n}`);
}

if (DRY) {
  console.log(`\n🔍 DRY-RUN — nic nezapsáno. Zápis: DRY_RUN=0`);
  process.exit(0);
}

// ── Zápis ──────────────────────────────────────────────────────────────────
let written = 0, newLinks = 0, changedFiles = 0;
for (const p of plan.values()) {
  const rp = path.join(ENTITIES, p.dir, "relations.json");
  if (!fs.existsSync(rp)) continue;
  const rel = JSON.parse(fs.readFileSync(rp, "utf8"));
  const cur: string[] = Array.isArray(rel.featuring) ? rel.featuring : [];
  const merged = [...new Set([...cur, ...p.feats])].sort();
  if (merged.length === cur.length) continue;
  newLinks += merged.length - cur.length;
  rel.featuring = merged;
  fs.writeFileSync(rp, JSON.stringify(rel, null, 2) + "\n");
  written++;
}
console.log(`\n✅ Zapsáno: ${written} entit, ${newLinks} nových vazeb`);
