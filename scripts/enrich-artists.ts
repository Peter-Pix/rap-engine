#!/usr/bin/env npx tsx
/**
 * enrich-artists.ts — deterministické obohacení prázdných profilů interpretů.
 *
 * Zásada: ŽÁDNÉ prázdné stránky. Generuje se VÝHRADNĚ z reálných dat grafu
 * (skladby, alba, spolupracovníci). ŽÁDNÉ vymyšlené biografie — ty patří
 * do ruční práce a nesmí je nic přepsat.
 *
 * GATE 0: artist už má kvalitní obsah (>=600 B těla) → NIKDY nepřepisovat
 *         (147 bohatých profilů = ruční práce s biografií, diskografií, citacemi)
 * GATE 1: < 3 skladby → přeskočit (zůstane noindex/draft, žádná prázdná stránka)
 *
 * Usage:
 *   npx tsx scripts/enrich-artists.ts            # dry-run
 *   DRY_RUN=0 npx tsx scripts/enrich-artists.ts # zápis
 *   FORCE=1 ...                                  # přegenerovat
 */
import fs from "node:fs";
import path from "node:path";
import { mayOverwrite } from "./lib/content-guard.js";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".content-cache");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";
const FORCE = process.env.FORCE === "1";
const MIN_TRACKS = Number(process.env.MIN_TRACKS ?? 3);

type Ent = { id: string; type: string; slug: string; title: string; description?: string; content?: string; extraMeta?: Record<string, unknown>; outbound?: Record<string, string[]> };
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

type ArtistStats = {
  tracks: string[];       // tracky, kde je artist hlavní (HAS_ARTIST)
  albums: string[];       // alba, kde je artist hlavní (RELATED_ARTIST z alba)
  collabs: Map<string, number>; // spoluinterpreti na jeho skladbách
  richTracks: string[];
};

function artistStats(artistId: string): ArtistStats {
  // tracky: hrana track → HAS_ARTIST → artist
  const tracks = (inIdx.get(artistId) ?? [])
    .filter((x) => x.relation === "HAS_ARTIST" && ents[x.from]?.type === "track")
    .map((x) => x.from);

  // alba: hrana album → RELATED_ARTIST → artist
  const albums = (inIdx.get(artistId) ?? [])
    .filter((x) => x.relation === "RELATED_ARTIST" && ents[x.from]?.type === "album")
    .map((x) => x.from);

  // spoluinterpreti: na jeho skladbách hraje i někdo jiný (reálná hrana)
  const collabs = new Map<string, number>();
  const richTracks: string[] = [];
  for (const t of tracks) {
    for (const x of outIdx.get(t) ?? []) {
      if (x.relation === "HAS_ARTIST" && x.to !== artistId && ents[x.to]?.type === "artist") {
        collabs.set(x.to, (collabs.get(x.to) ?? 0) + 1);
      }
    }
    if ((ents[t]?.content ?? "").length > 800) richTracks.push(t);
  }

  return { tracks, albums, collabs, richTracks };
}

function mdxFor(a: Ent, s: ArtistStats): string {
  let m = "";

  // ── Kdo to je (max opatrně — jen co víme z dat)
  m += `## Kdo to je\n\n`;
  m += `**${a.title}** je interpret zastoupený v naší databázi české a slovenské rapové scény`;
  if (s.albums.length > 0) m += ` s **${s.albums.length} ${s.albums.length === 1 ? "albem" : s.albums.length < 5 ? "alby" : "alby"}**`;
  m += `. Celkem u nás najdete **${s.tracks.length} ${s.tracks.length === 1 ? "skladbu" : s.tracks.length < 5 ? "skladby" : "skladeb"}**.\n\n`;

  // ── Diskografie (alba)
  if (s.albums.length > 0) {
    m += `## Diskografie\n\n`;
    // seřaď podle roku (nejnovější první)
    const sorted = [...s.albums].sort((a, b) => {
      const ya = (ents[a] as unknown as { year?: number })?.year ?? 0;
      const yb = (ents[b] as unknown as { year?: number })?.year ?? 0;
      return yb - ya;
    });
    for (const al of sorted.slice(0, 12)) {
      const y = (ents[al] as unknown as { year?: number })?.year;
      m += `- [${titleOf(al)}](${routeOf(al)})${y ? ` (${y})` : ""}\n`;
    }
    if (sorted.length > 12) m += `\n*…a dalších ${sorted.length - 12} alb.*\n`;
    m += `\n`;
  }

  // ── Nejznámější skladby
  const sample = [...s.tracks]
    .sort((a, b) => (ents[b]?.content ?? "").length - (ents[a]?.content ?? "").length)
    .slice(0, 10);
  if (sample.length > 0) {
    m += `## Skladby\n\n`;
    for (const t of sample) m += `- [${titleOf(t)}](${routeOf(t)})\n`;
    if (s.tracks.length > 10) m += `\n*…a dalších ${s.tracks.length - 10} skladeb.*\n`;
    m += `\n`;
  }

  // ── Spolupráce
  const collabList = [...s.collabs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (collabList.length > 0) {
    m += `## Spolupráce\n\n`;
    m += `Na skladbách se podíleli také: ${collabList.map(([id, n]) => `[${titleOf(id)}](${routeOf(id)}) (${n})`).join(", ")}.\n`;
  }

  return m.trim();
}

// ── Main
const artists = Object.values(ents).filter((e) => e.type === "artist");
const results: { id: string; title: string; len: number; tracks: number; skip?: string }[] = [];

for (const a of artists) {
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
  const s = artistStats(a.id);
  if (s.tracks.length < MIN_TRACKS) {
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
    meta.description = `${a.title} — interpret v české a slovenské rapové scéně. ${s.tracks.length} skladeb${s.albums.length ? `, ${s.albums.length} alb` : ""}.`;
    // Stale stub/draft flagy blokují indexaci i u hotového obsahu
    if (meta.isStub === true) delete meta.isStub;
    if (meta.stubReason) delete meta.stubReason;
    if (meta.draftReason) delete meta.draftReason;
    if (meta.status === "draft") delete meta.status;
    if (meta.extraMeta?.isStub === true) delete meta.extraMeta.isStub;
    if (meta.extraMeta?.noindex === true) delete meta.extraMeta.noindex;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

    const fm = `---\nid: ${a.id}\ntype: artist\ntitle: ${JSON.stringify(a.title)}\n---\n\n# ${a.title}\n\n`;
    fs.writeFileSync(path.join(dir, "entity.mdx"), fm + mdx + "\n");
  }
}

const ok = results.filter((r) => !r.skip);
const hasContent = results.filter((r) => r.skip === "chráníno");
const tooFew = results.filter((r) => r.skip === "málo skladeb");
const avg = ok.length ? Math.round(ok.reduce((a, r) => a + r.len, 0) / ok.length) : 0;

console.log(`Interpreti: ${results.length} | obohaceno: ${ok.length} | ochráněno: ${hasContent.length} | málo skladeb: ${tooFew.length}`);
console.log(`Ø obsah: ${avg} znaků (min ${MIN_TRACKS} skladeb)`);
console.log("");
for (const r of ok.sort((a, b) => b.tracks - a.tracks)) {
  console.log(`  ${String(r.tracks).padStart(3)} skl | ${String(r.len).padStart(5)}B | ${r.title}`);
}
console.log("");
if (DRY_RUN) console.log("[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
