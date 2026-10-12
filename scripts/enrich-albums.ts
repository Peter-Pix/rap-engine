#!/usr/bin/env npx tsx
/**
 * enrich-albums.ts — deterministické obohacení obsahu alb z grafu.
 *
 * Zásada: ŽÁDNÉ prázdné stránky. Obsah se generuje VÝHRADNĚ z reálných dat
 * (tracklist, hosté, témata, nálady). Nic se nevymýšlí.
 *
 * GATE: album s < 3 tracky → přeskočit (zůstane noindex).
 * GATE: album už má kvalitní obsah (>=600 B těla) → nepřepisovat.
 *
 * Usage:
 *   npx tsx scripts/enrich-albums.ts           # dry-run
 *   DRY_RUN=0 npx tsx scripts/enrich-albums.ts # zápis
 *   FORCE=1 ... # přegenerovat i obohacená
 */
import fs from "node:fs";
import path from "node:path";
import { mayOverwrite } from "./lib/content-guard.js";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".content-cache");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";
const FORCE = process.env.FORCE === "1";

type Ent = { id: string; type: string; slug: string; title: string; description?: string; content?: string; extraMeta?: Record<string, unknown> };
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
const routeOf = (id: string) => {
  const t = ents[id]?.type, s = ents[id]?.slug ?? id;
  const map: Record<string, string> = { artist: "raperi", track: "skladby", album: "alba", genre: "zanry", style: "styly", theme: "temata", mood: "nalady", label: "labely", location: "lokality" };
  return `/${map[t] ?? t}/${s}`;
};

/** Tělo MDX bez frontmatteru a nadpisů — skutečný obsah. */
function existingBodyLength(id: string): number {
  const p = path.join(ENTITIES, id, "entity.mdx");
  if (!fs.existsSync(p)) return 0;
  const raw = fs.readFileSync(p, "utf8");
  const fm = raw.match(/^---[\s\S]*?---\n?/);
  const body = fm ? raw.slice(fm[0].length) : raw;
  return body.replace(/^#+\s.*$/gm, "").replace(/\s+/g, " ").trim().length;
}

type AlbumStats = {
  tracks: string[];
  richTracks: string[];
  artists: Map<string, number>;
  mainArtist: string | null;
  themes: Map<string, number>;
  moods: Map<string, number>;
  featTracks: string[];
  year?: number;
  entThemes: string[];
  entMoods: string[];
};

function albumStats(albumId: string): AlbumStats {
  const trackIds = (outIdx.get(albumId) ?? [])
    .filter((x) => x.relation === "HAS_TRACK" && ents[x.to]?.type === "track")
    .map((x) => x.to);
  // fallback: inverzní hrana
  if (trackIds.length === 0) {
    for (const x of inIdx.get(albumId) ?? []) {
      if (x.relation === "BELONGS_TO_ALBUM" && ents[x.from]?.type === "track") trackIds.push(x.from);
    }
  }

  const artists = new Map<string, number>();
  const themes = new Map<string, number>();
  const moods = new Map<string, number>();
  const featTracks: string[] = [];
  const richTracks: string[] = [];

  for (const t of trackIds) {
    const te = ents[t];
    if (!te) continue;
    // hlavní artist skladby
    for (const x of outIdx.get(t) ?? []) {
      if (x.relation === "HAS_ARTIST" && ents[x.to]?.type === "artist") {
        artists.set(x.to, (artists.get(x.to) ?? 0) + 1);
      }
    }
    // host = track, jehož hlavní artist NENÍ hlavní artist alba (reálná hrana, ne regex)
    // (dopočítá se později, až známe mainArtist)
    // témata/nálady z extraMeta
    const em = te.extraMeta ?? {};
    for (const th of (em.themes as string[]) ?? []) themes.set(th, (themes.get(th) ?? 0) + 1);
    for (const mo of (em.moods as string[]) ?? []) moods.set(mo, (moods.get(mo) ?? 0) + 1);
    if ((te.content ?? "").length > 800) richTracks.push(t);
  }

  // hlavní artist = album → RELATED_ARTIST nebo nejčastější z tracků
  const relArtists = (outIdx.get(albumId) ?? [])
    .filter((x) => x.relation === "RELATED_ARTIST" && ents[x.to]?.type === "artist")
    .map((x) => x.to);
  const mainArtist = relArtists[0] ?? [...artists.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  let year = (ents[albumId] as unknown as { year?: number })?.year;
  if (!year) {
    const mp = path.join(ENTITIES, albumId, "meta.json");
    if (fs.existsSync(mp)) {
      try { year = JSON.parse(fs.readFileSync(mp, "utf8")).year; } catch { /* ignore */ }
    }
  }

  // hosté = tracky, jejichž hlavní artist != mainArtist alba (reálná hrana)
  const guestTracks: string[] = [];
  if (mainArtist) {
    for (const t of trackIds) {
      const primary = (outIdx.get(t) ?? []).find(
        (x) => x.relation === "HAS_ARTIST" && ents[x.to]?.type === "artist",
      )?.to;
      if (primary && primary !== mainArtist) guestTracks.push(t);
    }
  }

  // Entity-level vazby (BEZPEČNÉ odkazy): album → HAS_THEME / HAS_MOOD
  const entThemes: string[] = [];
  const entMoods: string[] = [];
  for (const x of outIdx.get(albumId) ?? []) {
    if (ents[x.to]?.type === "theme") entThemes.push(x.to);
    if (ents[x.to]?.type === "mood") entMoods.push(x.to);
  }

  return { tracks: trackIds, richTracks, artists, mainArtist, themes, moods, featTracks: guestTracks, year, entThemes, entMoods };
}

function mdxFor(album: Ent, s: AlbumStats): string {
  const main = s.mainArtist ? `[${titleOf(s.mainArtist)}](${routeOf(s.mainArtist)})` : null;
  const others = [...s.artists.keys()].filter((a) => a !== s.mainArtist);
  const featArtists = [...new Set(s.featTracks.flatMap((t) => {
    return (outIdx.get(t) ?? []).filter((x) => x.relation === "HAS_ARTIST" && x.to !== s.mainArtist).map((x) => x.to);
  }))];

  let m = "";

  // ── Kontext
  m += `## Kontext\n\n`;
  if (main) {
    m += `**${album.title}** je album, které ${s.year ? `v roce ${s.year} ` : ""}vydal ${main}`;
    m += others.length > 0 ? ` (spolupráce: ${others.slice(0, 4).map((a) => `[${titleOf(a)}](${routeOf(a)})`).join(", ")})` : "";
    m += `. Obsahuje **${s.tracks.length} skladeb**`;
    m += featArtists.length > 0 ? `, na kterých se podíleli i ${featArtists.slice(0, 4).map((a) => `[${titleOf(a)}](${routeOf(a)})`).join(", ")}` : "";
    m += `.\n\n`;
  } else {
    m += `**${album.title}** je album s **${s.tracks.length} skladbami**.\n\n`;
  }

  // ── Seznam skladeb se NEgeneruje do MDX — vykresluje ho interaktivní
  //    komponenta <Tracklist> (pořadí, délka, přehrávání, proklik).
  //    MDX nese pouze editoriální text (kontext, témata, nálady).

  // ── Hosté (feat) — editoriální hodnota místo seznamu skladeb
  if (featArtists.length > 0) {
    m += `## Hosté\n\n`;
    m += `Na albu hostují: ${featArtists.slice(0, 12).map((a) => `[${titleOf(a)}](${routeOf(a)})`).join(", ")}`;
    if (featArtists.length > 12) m += ` a další`;
    m += `.\n\n`;
  }

  // ── Témata a nálady (JEN odkazovatelné entity z grafu!)
  // Volný text z RM (extraMeta.themes) se nepoužívá — nemá mapování na naše entity.
  if (s.entThemes.length > 0 || s.entMoods.length > 0) {
    m += `## Čemu se album věnuje\n\n`;
    if (s.entThemes.length > 0) {
      m += `**Témata:** ${s.entThemes.slice(0, 8).map((id) => `[${titleOf(id)}](${routeOf(id)})`).join(", ")}\n\n`;
    }
    if (s.entMoods.length > 0) {
      m += `**Nálada:** ${s.entMoods.slice(0, 6).map((id) => `[${titleOf(id)}](${routeOf(id)})`).join(", ")}\n\n`;
    }
  }

  // ── "Kde začít" se rovněž negeneruje — seznam skladeb je jen jeden
  //    (komponenta <Tracklist>), aby se tracky nezobrazovaly dvakrát.

  return m.trim();
}

// ── Main
const albums = Object.values(ents).filter((e) => e.type === "album");
const results: { id: string; title: string; len: number; tracks: number; skip?: string }[] = [];

for (const a of albums) {
  // Ochrana původního obsahu (content-guard) — bohatý obsah se NIKDY nepřepíše.
  const guard = mayOverwrite(ENTITIES, a.id, {
    force: FORCE,
    allowRich: process.env.ALLOW_RICH === "1",
    confirmed: process.env.I_KNOW_WHAT_I_DO === "1",
  });
  if (!guard.allowed) {
    results.push({ id: a.id, title: a.title, len: guard.currentLength, tracks: 0, skip: "chráníno" });
    continue;
  }
  const bodyLen = guard.currentLength;
  const s = albumStats(a.id);
  if (s.tracks.length < 3) {
    results.push({ id: a.id, title: a.title, len: bodyLen, tracks: s.tracks.length, skip: "málo skladeb" });
    continue;
  }
  const mdx = mdxFor(a, s);
  results.push({ id: a.id, title: a.title, len: mdx.length, tracks: s.tracks.length });

  if (!DRY_RUN) {
    const dir = path.join(ENTITIES, a.id);
    fs.mkdirSync(dir, { recursive: true });
    const metaPath = path.join(dir, "meta.json");
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : { id: a.id, type: a.type, slug: a.slug, title: a.title };
    // description: konkrétní, ne šablona
    const main = s.mainArtist ? titleOf(s.mainArtist) : null;
    meta.description = `${a.title}${main ? ` — album od ${main}` : ""}${s.year ? ` (${s.year})` : ""}: ${s.tracks.length} skladeb.`;
    if (meta.isStub === true) delete meta.isStub;
    if (meta.stubReason) delete meta.stubReason;
    if (meta.extraMeta?.isStub === true) delete meta.extraMeta.isStub;
    if (meta.extraMeta?.noindex === true) delete meta.extraMeta.noindex;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

    const fm = `---\nid: ${a.id}\ntype: album\ntitle: ${JSON.stringify(a.title)}\n---\n\n# ${a.title}\n\n`;
    fs.writeFileSync(path.join(dir, "entity.mdx"), fm + mdx + "\n");
  }
}

const ok = results.filter((r) => !r.skip);
const hasContent = results.filter((r) => r.skip === "chráníno");
const tooFew = results.filter((r) => r.skip === "málo skladeb");
const avg = ok.length ? Math.round(ok.reduce((a, r) => a + r.len, 0) / ok.length) : 0;

console.log(`Alba: ${results.length} | obohaceno: ${ok.length} | ochráněno: ${hasContent.length} | málo skladeb: ${tooFew.length}`);
console.log(`Ø obsah: ${avg} znaků`);
console.log("");
console.log("Vzorek (top 12 podle skladeb):");
for (const r of ok.sort((a, b) => b.tracks - a.tracks).slice(0, 12)) {
  console.log(`  ${String(r.tracks).padStart(3)} skl | ${String(r.len).padStart(5)}B | ${r.title}`);
}
console.log("");
if (DRY_RUN) console.log("[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
