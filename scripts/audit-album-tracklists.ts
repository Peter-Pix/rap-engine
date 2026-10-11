#!/usr/bin/env -S npx tsx
/**
 * Audit album tracklistů — oddělí OVĚŘENÉ od CIZÍCH.
 *
 * Proč: 529 alb má `tracks.json` z Deezeru. U části z nich interprety tracků
 * NEODPOVÍDAJÍ interpretovi alba (Foo Fighters na albu Robin Zoota) → matching error.
 *
 * Klasifikace pro každé album s tracks.json:
 *   OK       = album artist mezi interprety tracků
 *              NEBO aspoň 1 track artist je známý CZ/SK artist z RKG
 *              NEBO názvy tracků nesou CZ/SK signál (diakritika, česká slova)
 *   REJECTED = nic z toho → cizí tracklist
 *
 * Zápis (DRY_RUN=0):
 *   REJECTED → tracks.json → tracks.rejected.json (zachovat pro audit)
 *
 * Použití:
 *   npx tsx scripts/audit-album-tracklists.ts
 *   DRY_RUN=0 npx tsx scripts/audit-album-tracklists.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";

/** Ruční whitelist — skupiny/přezdívky, kde se jména liší od jmen členů v DB. */
const GROUP_ALIASES = new Set(["album_kf-ako-rolls", "album_bozk-na-rozlucku", "album_rap-n-roll", "album_umenie-zit"]);

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** CZ/SK signál v názvu — diakritika + častá česká/slovenská slova. */
const CZ_SK_WORDS = ["se","si","je","to","na","za","do","ale","ako","ked","kdyz","som","jsem","nie","nejde","mesto","klid","casy","dennodenne","vydych","nadech","dievca","bratr","svet","zivot","laska","smrt","ruce","slova","vina","noc","den","cas","krev","nebo","neboj"];
function czechSignal(titles: string[]): boolean {
  const blob = titles.join(" ").toLowerCase();
  if (/[áčďéěíňóřšťúůýžľĺŕäô]/.test(blob)) return true;
  const words = blob.split(/[^a-zá-ž]+/i).filter(Boolean);
  const hits = words.filter((w) => CZ_SK_WORDS.includes(w)).length;
  return hits >= 3;
}

const artistByKey = new Map<string, string>();
const albumArtist = new Map<string, string[]>();
for (const d of fs.readdirSync(ENTITIES, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const mp = path.join(ENTITIES, d.name, "meta.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));
  if (d.name.startsWith("artist_")) {
    for (const k of [norm(m.title), norm(m.slug ?? ""), norm(d.name.replace(/^artist_/, ""))]) {
      if (k && !artistByKey.has(k)) artistByKey.set(k, m.id);
    }
  } else if (d.name.startsWith("album_")) {
    const rp = path.join(ENTITIES, d.name, "relations.json");
    if (!fs.existsSync(rp)) continue;
    const r = JSON.parse(fs.readFileSync(rp, "utf8"));
    albumArtist.set(m.id, (r.artists ?? []).map((a: string) => norm(a.replace(/^artist_/, "").replace(/-/g, " "))));
  }
}

const ok: string[] = [];
const rejected: { id: string; albumArtist: string[]; trackArtists: string[]; n: number }[] = [];

for (const d of fs.readdirSync(ENTITIES)) {
  if (!d.startsWith("album_")) continue;
  const tp = path.join(ENTITIES, d, "tracks.json");
  if (!fs.existsSync(tp)) continue;
  const j = JSON.parse(fs.readFileSync(tp, "utf8"));
  const tracks: any[] = j.tracks ?? [];
  if (!tracks.length) continue;
  const trArtists = new Set<string>();
  for (const t of tracks) for (const a of t.artists ?? []) trArtists.add(norm(a));
  if (!trArtists.size) continue;

  const aArtists = albumArtist.get(d) ?? [];
  const known = [...trArtists].filter((x) => artistByKey.has(x));
  const artistMatch = aArtists.some((a) => [...trArtists].some((x) => x === a || x.includes(a) || a.includes(x)));
  const titles = tracks.map((t: any) => String(t.title ?? ""));

  if (GROUP_ALIASES.has(d) || artistMatch || known.length > 0 || czechSignal(titles)) ok.push(d);
  else rejected.push({ id: d, albumArtist: aArtists.slice(0, 2), trackArtists: [...trArtists].slice(0, 3), n: tracks.length });
}

console.log(`✅ OK:       ${ok.length}`);
console.log(`❌ REJECTED: ${rejected.length} (celkem ${rejected.reduce((a, r) => a + r.n, 0)} skladeb)\n`);
for (const r of rejected) console.log(`  ${r.id} | album: ${r.albumArtist.join(",") || "—"} | track: ${r.trackArtists.join(",")} | ${r.n} trk`);

if (DRY_RUN) { console.log("\n[DRY-RUN] Nic nepřejmenováno. DRY_RUN=0 pro zápis."); process.exit(0); }

let moved = 0;
for (const r of rejected) {
  const tp = path.join(ENTITIES, r.id, "tracks.json");
  if (!fs.existsSync(tp)) continue;
  fs.renameSync(tp, path.join(ENTITIES, r.id, "tracks.rejected.json"));
  moved++;
}
console.log(`\n✅ Přejmenováno ${moved} → tracks.rejected.json · ověřených: ${ok.length}`);
