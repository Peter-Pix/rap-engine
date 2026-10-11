#!/usr/bin/env npx tsx
/**
 * enrich-artist-descriptions.ts — konkrétní popis interpreta z reálných dat grafu.
 *
 * Problém: 102 interpretů má generický popis („Umělec X" / „X — stub. Plný profil
 * bude doplněn později."). To škodí SEO i uživateli.
 *
 * Řešení: složit popis VÝHRADNĚ z faktů, které o interpretovi máme:
 *   - odkud je (ORIGINATES_FROM / city)
 *   - od kdy je aktivní (activeSince)
 *   - žánry (HAS_GENRE)
 *   - label (RELEASED_BY / label)
 *   - kolik má skladeb a alb
 *   - s kým spolupracuje (feat partneři)
 *
 * NIKDY nepřepíše kvalitní ruční popis (delší než 60 znaků a bez „stub"/„Umělec X").
 * NIKDY si nevymýšlí (žádná biografie, žádná ocenění, žádná historie).
 *
 * Usage:
 *   npx tsx scripts/enrich-artist-descriptions.ts            # dry-run
 *   DRY_RUN=0 npx tsx scripts/enrich-artist-descriptions.ts # zápis
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".content-cache");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";

type Ent = {
  id: string; type: string; slug: string; title: string; description?: string;
  extraMeta?: Record<string, unknown>; outbound?: Record<string, string[]>;
};
type Edge = { from: string; to: string; relation: string };

const entsJson = JSON.parse(fs.readFileSync(path.join(CACHE, "entities.json"), "utf8"));
const ents: Record<string, Ent> = entsJson.entities ?? entsJson;
const graph: Edge[] = JSON.parse(fs.readFileSync(path.join(CACHE, "graph.json"), "utf8"));

const outIdx = new Map<string, Edge[]>();
const inIdx = new Map<string, Edge[]>();
for (const e of graph) {
  if (!outIdx.has(e.from)) outIdx.set(e.from, []);
  outIdx.get(e.from)!.push(e);
  if (!inIdx.has(e.to)) inIdx.set(e.to, []);
  inIdx.get(e.to)!.push(e);
}
const titleOf = (id: string) => ents[id]?.title ?? id;

/** Je popis generický (stub / „Umělec X")? */
function isGeneric(desc: string | undefined): boolean {
  if (!desc) return true;
  const d = desc.trim();
  if (d.length < 60) return true;
  if (/^Umělec\b/i.test(d)) return true;
  if (/^Umělec$/i.test(d)) return true;
  if (/^Placeholder/i.test(d)) return true;
  if (/stub|bude doplněn|bude doplněno/i.test(d)) return true;
  // Krátká jednoslovná/šablonová věta bez informace
  if (/^[^.]{0,40}\.$/.test(d)) return true;
  return false;
}

type Facts = {
  city?: string; origin?: string; activeSince?: string; realName?: string;
  label?: string; genres: string[]; tracks: number; albums: number; collabs: string[];
};

function factsFor(a: Ent): Facts {
  const em = (a.extraMeta ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  const genres = (outIdx.get(a.id) ?? [])
    .filter((x) => x.relation === "HAS_GENRE" && ents[x.to]?.type === "genre")
    .map((x) => titleOf(x.to));

  const tracks = (inIdx.get(a.id) ?? [])
    .filter((x) => x.relation === "HAS_ARTIST" && ents[x.from]?.type === "track")
    .map((x) => x.from);

  const albums = (inIdx.get(a.id) ?? [])
    .filter((x) => x.relation === "RELATED_ARTIST" && ents[x.from]?.type === "album")
    .map((x) => x.from);

  // spolupráce: kdo další je na jeho skladbách
  const collabs: string[] = [];
  for (const t of tracks) {
    for (const x of outIdx.get(t) ?? []) {
      if (x.relation === "HAS_ARTIST" && x.to !== a.id && ents[x.to]?.type === "artist") collabs.push(x.to);
    }
  }

  // label: z extraMeta, nebo přes RELEASED_BY
  const relLabel = (outIdx.get(a.id) ?? []).find((x) => x.relation === "RELEASED_BY" && ents[x.to]?.type === "label")?.to;

  return {
    city: str(em.city),
    origin: str(em.origin) ?? str(a["origin" as keyof Ent]),
    activeSince: str(em.activeSince),
    realName: str(em.realName),
    label: str(em.label) ?? (relLabel ? titleOf(relLabel) : undefined),
    genres: [...new Set(genres)],
    tracks: tracks.length,
    albums: albums.length,
    collabs: [...new Set(collabs)],
  };
}

function buildDescription(a: Ent, f: Facts): string | null {
  // ── Věta 1: kdo to je
  let sentence: string;
  const head = f.realName ? `${f.realName} (uměleckým jménem ${a.title})` : a.title;
  const kind = /producent/i.test(f.genres.join(" ")) ? "producent" : "interpret";
  const place = f.city ?? f.origin;
  const nationality = place && /^(bratislava|košice|kosice|nitra|žilina|zilina|prešov|presov|trnava|martin|banská|poprad)/i.test(place)
    ? "slovenský" : "český";
  sentence = `${head} je ${nationality} ${kind}`;
  if (place) sentence += ` působící v ${place}`;
  if (f.activeSince) sentence += `, aktivní od roku ${f.activeSince}`;
  if (f.label) sentence += `, spjatý s labelem ${f.label}`;
  sentence += ".";

  let s = sentence;

  // Žánry
  if (f.genres.length > 0) {
    const g = f.genres.slice(0, 3);
    s += ` Tvoří především ${g.length > 1 ? g.slice(0, -1).join(", ") + " a " + g.at(-1) : g[0]}.`;
  }

  // Rozsah tvorby
  const bits: string[] = [];
  if (f.tracks > 0) bits.push(`${f.tracks} ${f.tracks === 1 ? "skladbu" : f.tracks < 5 ? "skladby" : "skladeb"}`);
  if (f.albums > 0) bits.push(`${f.albums} ${f.albums === 1 ? "album" : f.albums < 5 ? "alba" : "alb"}`);
  if (bits.length > 0) s += ` V databázi u něj najdete ${bits.join(" a ")}.`;

  // Spolupráce
  if (f.collabs.length > 0) {
    const c = f.collabs.slice(0, 3).map(titleOf);
    s += ` Spolupracoval mimo jiné s ${c.join(", ")}.`;
  }

  // Gate: musí to být konkrétní, ne prázdný text
  if (s.length < 80) return null;
  return s;
}

// ── Main
const artists = Object.values(ents).filter((e) => e.type === "artist");
const results: { id: string; title: string; old: string; next: string | null; skip?: string }[] = [];

for (const a of artists) {
  if (!isGeneric(a.description)) {
    results.push({ id: a.id, title: a.title, old: a.description ?? "", next: null, skip: "už má dobrý popis" });
    continue;
  }
  const f = factsFor(a);
  const next = buildDescription(a, f);
  results.push({ id: a.id, title: a.title, old: a.description ?? "", next, skip: next ? undefined : "málo dat" });

  if (!DRY_RUN && next) {
    const metaPath = path.join(ENTITIES, a.id, "meta.json");
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      meta.description = next;
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
    }
  }
}

const ok = results.filter((r) => !r.skip);
const good = results.filter((r) => r.skip === "už má dobrý popis");
const few = results.filter((r) => r.skip === "málo dat");

console.log(`Interpreti: ${results.length} | nový popis: ${ok.length} | už dobrý: ${good.length} | málo dat: ${few.length}`);
console.log("");
console.log("=== vzorek nových popisů ===");
for (const r of ok.slice(0, 8)) {
  console.log(`\n  ${r.title}  (${r.id})`);
  console.log(`    bylo: ${r.old || "(prázdné)"}`);
  console.log(`    nově: ${r.next}`);
}
console.log("");
if (DRY_RUN) console.log("[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
