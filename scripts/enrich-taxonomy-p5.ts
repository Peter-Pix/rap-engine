#!/usr/bin/env npx tsx
/**
 * enrich-taxonomy-p5.ts — deterministické obohacení label/location/collective/
 * producer/scene z grafu.
 *
 * Zásada: ŽÁDNÉ prázdné stránky. Obsah VÝHRADNĚ z reálných hran. Nic se nevymýšlí.
 *
 * Každý typ má vlastní logiku:
 *   label      → alba, artisti (kdo vydává), žánry, roky
 *   location   → artisti odtud, alba, žánry
 *   collective → členové (artisti), alba, žánry
 *   producer   → produkované tracky/alba, artisti
 *   scene      → artisti ve scéně, žánry, alba
 *
 * GATE: < 3 vazby daného typu → přeskočit (zůstane noindex).
 * GATE: už má kvalitní obsah → nepřepisovat (content-guard).
 *
 * Usage:
 *   npx tsx scripts/enrich-taxonomy-p5.ts            # dry-run
 *   DRY_RUN=0 npx tsx scripts/enrich-taxonomy-p5.ts # zápis
 */
import fs from "node:fs";
import path from "node:path";
import { mayOverwrite } from "./lib/content-guard.js";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".content-cache");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";

type Ent = { id: string; type: string; slug: string; title: string; description?: string; content?: string; extraMeta?: Record<string, unknown>; profile?: Record<string, unknown> };
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
const ROUTES: Record<string, string> = { artist: "raperi", track: "skladby", album: "alba", genre: "zanry", style: "styly", theme: "temata", mood: "nalady", label: "labely", location: "lokality", collective: "kolektivy", producer: "producenti", scene: "sceny" };
const routeOf = (id: string) => `/${ROUTES[ents[id]?.type ?? ""] ?? ents[id]?.type}/${ents[id]?.slug ?? id}`;
const link = (id: string) => `[${titleOf(id)}](${routeOf(id)})`;
const pl = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : many;

/** Všechny entity daného typu navázané na entitu (obousměrně, přes libovolnou relaci). */
function neighborsOfType(id: string, type: string): Set<string> {
  const out = new Set<string>();
  for (const e of [...(outIdx.get(id) ?? []), ...(inIdx.get(id) ?? [])]) {
    const other = e.from === id ? e.to : e.from;
    if (ents[other]?.type === type) out.add(other);
  }
  return out;
}

/** Ověří, že cíl odkazu skutečně existuje (jinak 404). */
function safeLinks(ids: Iterable<string>): string[] {
  const ok: string[] = [];
  for (const id of ids) if (ents[id] && ROUTES[ents[id].type]) ok.push(id);
  return ok;
}

/** Nejčastější žánry mezi danou množinou entit. */
function topGenres(ids: string[], limit = 5): Array<[string, number]> {
  const c = new Map<string, number>();
  for (const id of ids) {
    for (const gId of neighborsOfType(id, "genre")) c.set(gId, (c.get(gId) ?? 0) + 1);
  }
  return [...c.entries()].sort((a, b) => b[1] - a[1] || titleOf(a[0]).localeCompare(titleOf(b[0]))).slice(0, limit);
}

/** Nejčastější témata/nálady (jen reálné entity, ne volný text). */
function topTaxonomies(ids: string[], type: "theme" | "mood", limit = 4): string[] {
  const c = new Map<string, number>();
  for (const id of ids) for (const t of neighborsOfType(id, type)) c.set(t, (c.get(t) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map((x) => x[0]);
}

/** Rozsah let z alb. */
function yearRange(albums: string[]): string | null {
  const ys: number[] = [];
  for (const a of albums) {
    const mp = path.join(ENTITIES, a, "meta.json");
    if (!fs.existsSync(mp)) continue;
    try {
      const y = JSON.parse(fs.readFileSync(mp, "utf8")).year;
      if (typeof y === "number" && y > 1950 && y < 2100) ys.push(y);
    } catch { /* ignore */ }
  }
  if (ys.length === 0) return null;
  const min = Math.min(...ys), max = Math.max(...ys);
  return min === max ? String(min) : `${min}–${max}`;
}

/** Sklonování slova podle typu entity (pro plynulou češtinu). */
const INSTR: Record<string, { gen: string; instr: string }> = {
  label: { gen: "labelu", instr: "tímto labelem" },
  location: { gen: "lokality", instr: "touto lokalitou" },
  collective: { gen: "kolektivu", instr: "tímto kolektivem" },
  producer: { gen: "producenta", instr: "tímto producentem" },
  scene: { gen: "scény", instr: "touto scénou" },
};
const HEADINGS: Record<string, string> = {
  label: "Co label vydává", location: "Kdo odtud pochází",
  collective: "Kdo je v kolektivu", producer: "Co producent vytvořil",
  scene: "Kdo do scény patří",
};

function mdxFor(ent: Ent): { body: string; stats: { main: number; albums: number; artists: number } } | null {
  const type = ent.type;
  const instr = INSTR[type] ?? { gen: "entity", instr: "touto entitou" };

  const artists = safeLinks(neighborsOfType(ent.id, "artist"));
  const albums = safeLinks(neighborsOfType(ent.id, "album"));
  // u producenta jsou hlavní produkované TRACKY
  const tracks = safeLinks(neighborsOfType(ent.id, "track"));
  const members = safeLinks(neighborsOfType(ent.id, "artist"));

  // Primární množina podle typu; label umí fallback na tracky (label s 1 albem
  // ale 115 tracky není prázdný — tracky jsou reálná datа).
  let primary: string[];
  if (type === "producer") primary = tracks;
  else if (type === "label") primary = albums.length >= 3 ? albums : tracks;
  else if (type === "collective") primary = albums.length >= 3 ? albums : members;
  else primary = artists;
  if (primary.length < 3) return null; // GATE: málo dat → noindex

  const genres = topGenres([...primary, ...artists].slice(0, 60));
  const themes = topTaxonomies(primary, "theme", 4);
  const moods = topTaxonomies(primary, "mood", 4);
  const years = yearRange(albums);

  let m = "";

  // ── Kontext
  m += `## Kontext\n\n`;
  switch (type) {
    case "label":
      m += `**${ent.title}** je hudební label působící v české a slovenské rapové scéně, který stojí za **${albums.length} ${pl(albums.length, "albem", "alby", "alby")}**`;
      m += artists.length > 0 ? ` od **${artists.length} ${pl(artists.length, "interpreta", "interpretů", "interpretů")}**` : "";
      if (tracks.length > 0) m += ` a pod jehož hlavičkou vyšlo **${tracks.length} ${pl(tracks.length, "skladba", "skladby", "skladeb")}**`;
      m += years ? `. Vydává je v rozmezí let ${years}.\n\n` : `.\n\n`;
      break;
    case "location":
      m += `**${ent.title}** je ${(ent.profile?.region as string) ? `${ent.profile.region}, ` : ""}město v České republice nebo na Slovensku, které má zastoupení v české a slovenské rapové scéně. V naší databázi se k němu hlásí **${artists.length} ${pl(artists.length, "interpret", "interpreti", "interpretů")}**`;
      m += albums.length > 0 ? `, kteří společně vydali **${albums.length} ${pl(albums.length, "album", "alba", "alb")}**` : "";
      m += `.\n\n`;
      break;
    case "collective":
      m += `**${ent.title}** je uskupení působící v české a slovenské rapové scéně. V naší databázi jsou s ním spojeni **${members.length} ${pl(members.length, "interpret", "interpreti", "interpretů")}**`;
      m += albums.length > 0 ? ` a **${albums.length} ${pl(albums.length, "album", "alba", "alb")}**` : "";
      m += `.\n\n`;
      break;
    case "producer":
      m += `**${ent.title}** je hudební producent působící v české a slovenské rapové scéně. V naší databázi je podepsán pod **${tracks.length} ${pl(tracks.length, "skladbou", "skladbami", "skladbami")}**`;
      m += artists.length > 0 ? ` od **${artists.length} ${pl(artists.length, "interpreta", "interpretů", "interpretů")}**` : "";
      m += `.\n\n`;
      break;
    case "scene":
      m += `**${ent.title}** je označení pro část české a slovenské rapové scény. V naší databázi do ní patří **${artists.length} ${pl(artists.length, "interpret", "interpreti", "interpretů")}**`;
      m += albums.length > 0 ? ` a **${albums.length} ${pl(albums.length, "album", "alba", "alb")}**` : "";
      m += `.\n\n`;
      break;
  }

  // ── Hlavní sekce
  const heading = HEADINGS[type] ?? "Souvislosti";
  m += `## ${heading}\n\n`;

  if (type === "label" || type === "collective") {
    const byArtist = new Map<string, string[]>();
    for (const a of albums) {
      for (const ar of neighborsOfType(a, "artist")) {
        if (artists.includes(ar) || type === "label") {
          if (!byArtist.has(ar)) byArtist.set(ar, []);
          byArtist.get(ar)!.push(a);
        }
      }
    }
    const sorted = [...byArtist.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12);
    if (sorted.length > 0) {
      for (const [ar, albs] of sorted) {
        m += `- ${link(ar)} — ${albs.length} ${pl(albs.length, "album", "alba", "alb")}\n`;
      }
      m += `\n`;
    }
    const rest = albums.filter((a) => !sorted.some(([, albs]) => albs.includes(a))).slice(0, 20);
    if (rest.length > 0) {
      m += `**Další alba:** ${rest.map(link).join(", ")}\n\n`;
    }
    // label: ukaž skladby, když je má (reálná data, žádná výplň).
    // Tracky jsou hodnotná informace i u labelu s plnou diskografií.
    if (type === "label" && tracks.length > 0 && albums.length < 20) {
      const rich = tracks.filter((t) => (ents[t]?.content ?? "").length > 300);
      const shown = (rich.length >= 5 ? rich : tracks).slice(0, 15);
      m += `**Skladby vydané u labelu** (${tracks.length} celkem): ${shown.map((t) => link(t)).join(", ")}`;
      if (tracks.length > shown.length) m += ` a další`;
      m += `.\n\n`;
    }
    // collective: členové
    if (type === "collective" && members.length > 0 && albums.length === 0) {
      m += `**Členové:** ${members.slice(0, 20).map((a) => link(a)).join(", ")}\n\n`;
    }
  } else if (type === "producer") {
    const byArtist = new Map<string, string[]>();
    for (const t of tracks) {
      const ar = [...neighborsOfType(t, "artist")][0];
      if (ar) {
        if (!byArtist.has(ar)) byArtist.set(ar, []);
        byArtist.get(ar)!.push(t);
      }
    }
    const sorted = [...byArtist.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    for (const [ar, trs] of sorted) {
      m += `- ${link(ar)} — ${trs.length} ${pl(trs.length, "skladba", "skladby", "skladeb")}\n`;
    }
    m += `\n`;
    const sample = tracks.filter((t) => (ents[t]?.content ?? "").length > 0).slice(0, 10);
    if (sample.length > 0) {
      m += `**Ukázky produkce:** ${sample.map((t) => link(t)).join(", ")}\n\n`;
    }
  } else {
    // location / scene
    const list = artists.slice(0, 30);
    if (list.length > 0) {
      m += list.map((a) => {
        const city = ents[a]!.profile?.origin ?? ents[a]!.profile?.city;
        return `- ${link(a)}${typeof city === "string" && city ? ` — ${city}` : ""}`;
      }).join("\n") + "\n\n";
    }
  }

  // ── Žánry
  if (genres.length > 0) {
    m += `## Žánrové zaměření\n\n`;
    m += `Tvorba spojená s ${instr.instr} se nejčastěji pohybuje v žánrech: `;
    m += genres.map(([gId, n]) => `**${link(gId)}** (${n})`).join(", ") + `.\n\n`;
  }

  // ── Témata a nálady (jen reálné entity → žádné 404)
  if (themes.length > 0 || moods.length > 0) {
    m += `## Čemu se tvorba věnuje\n\n`;
    if (themes.length > 0) {
      m += `Mezi opakující se témata patří ${themes.map(link).join(", ")}. `;
    }
    if (moods.length > 0) {
      m += `Náladově se tvorba nese především v polohách ${moods.map(link).join(", ")}.`;
    }
    m += `\n\n`;
  }

  // ── Statistiky
  m += `## Zastoupení v databázi\n\n`;
  const rows: string[] = [];
  if (artists.length > 0) rows.push(`| Interpreti | ${artists.length} |`);
  if (albums.length > 0) rows.push(`| Alba | ${albums.length} |`);
  if (tracks.length > 0 && type === "producer") rows.push(`| Skladby | ${tracks.length} |`);
  if (years) rows.push(`| Roky | ${years} |`);
  if (rows.length > 0) {
    m += `| | |\n|---|---|\n${rows.join("\n")}\n`;
  }

  return { body: m.trim(), stats: { main: primary.length, albums: albums.length, artists: artists.length } };
}

// ── Main ────────────────────────────────────────────────────────────────────
const TYPES = ["label", "location", "collective", "producer", "scene"];
const results: Array<{ id: string; title: string; type: string; len: number; protectedBy?: string }> = [];
const skipped: Array<{ id: string; title: string; reason: string }> = [];

for (const ent of Object.values(ents)) {
  if (!TYPES.includes(ent.type)) continue;
  const mdxPath = path.join(ENTITIES, ent.id, "entity.mdx");
  if (!fs.existsSync(mdxPath)) { skipped.push({ id: ent.id, title: ent.title, reason: "chybí entity.mdx" }); continue; }

  const check = mayOverwrite(ENTITIES, ent.id, {
    force: process.env.FORCE === "1",
    allowRich: process.env.ALLOW_RICH === "1",
    confirmed: process.env.I_KNOW_WHAT_I_DO === "1",
  });
  if (!check.allowed) { skipped.push({ id: ent.id, title: ent.title, reason: check.reason }); continue; }

  const built = mdxFor(ent);
  if (!built) { skipped.push({ id: ent.id, title: ent.title, reason: "málo dat (<3 vazby)" }); continue; }

  const raw = fs.readFileSync(mdxPath, "utf8");
  const fm = raw.match(/^---[\s\S]*?\n---\n?/);
  const frontmatter = fm ? fm[0] : "---\n---\n";
  const body = built.body.startsWith("#") ? built.body : `# ${ent.title}\n\n${built.body}`;

  if (!DRY_RUN) {
    fs.writeFileSync(mdxPath, frontmatter + body + "\n");
    // vyčisti stale stub flagy na top-level meta.json (jinak blokují indexaci)
    const mp = path.join(ENTITIES, ent.id, "meta.json");
    if (fs.existsSync(mp)) {
      try {
        const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
        delete meta.isStub; delete meta.stubReason; delete meta.noindex;
        fs.writeFileSync(mp, JSON.stringify(meta, null, 2) + "\n");
      } catch { /* ignore */ }
    }
  }
  results.push({ id: ent.id, title: ent.title, type: ent.type, len: body.length });
}

// ── Report ──────────────────────────────────────────────────────────────────
const byType = new Map<string, number>();
for (const r of results) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);

console.log(`Typy: ${TYPES.join(", ")}`);
console.log(`Celkem: ${Object.values(ents).filter((e) => TYPES.includes(e.type)).length} | obohaceno: ${results.length} | přeskočeno: ${skipped.length}`);
if (results.length > 0) {
  console.log(`Ø obsah: ${Math.round(results.reduce((s, r) => s + r.len, 0) / results.length)} znaků`);
}
console.log("");
console.log("=== podle typu ===");
for (const [t, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${t}`);
}

const skipReasons = new Map<string, number>();
for (const s of skipped) {
  const key = s.reason.includes("ochráněno") || s.reason.includes("bohatý") ? "chráněno (má obsah)" : s.reason.includes("málo dat") ? "málo dat" : s.reason;
  skipReasons.set(key, (skipReasons.get(key) ?? 0) + 1);
}
console.log("");
console.log("=== přeskočeno podle důvodu ===");
for (const [r, n] of [...skipReasons.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${r}`);

console.log("");
console.log("=== vzorek (top 15) ===");
for (const r of results.sort((a, b) => b.len - a.len).slice(0, 15)) {
  console.log(`  ${String(r.len).padStart(5)}B | ${r.type.padEnd(10)} | ${r.title}`);
}

if (DRY_RUN) console.log("\n[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
else console.log("\n✅ Zapsáno. Spusť `npm run cache:build`.");
