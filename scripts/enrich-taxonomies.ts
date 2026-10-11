#!/usr/bin/env -S npx tsx
/**
 * Obohacení taxonomií (theme/mood/style/genre/scene) o reálný obsah.
 *
 * Problém: 86 taxonomických entit je 100% prázdných (jen "Téma X" formule),
 * ale mají 3 516 backlinků. Uživatel vidí prázdné stránky.
 *
 * Řešení: obsah generovaný DETERMINISTICKY z grafu — top skladby, interpreti,
 * statistiky. Žádná AI halucinace, jen fakta z dat.
 *
 * Zásada: pokud entita nemá dost dat (< 3 skladby), přeskočí se.
 *
 * Použití:
 *   npx tsx scripts/enrich-taxonomies.ts              # dry-run
 *   DRY_RUN=0 npx tsx scripts/enrich-taxonomies.ts    # zápis
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { mayOverwrite } from "./lib/content-guard.js";

const ROOT = path.resolve(__dirname, "..");
const ENTITIES = path.join(ROOT, "content", "entities");
const DRY_RUN = process.env.DRY_RUN !== "0";
const ONLY_TYPE = process.env.TAX_TYPE; // volitelně filtr
const FORCE = process.env.FORCE === "1"; // přegenerovat i entity s obsahem

// ─── Typy hran pro každou taxonomii ────────────────────────────────────────
const REL_FOR: Record<string, string> = {
  theme: "HAS_THEME",
  mood: "HAS_MOOD",
  style: "HAS_STYLE",
  genre: "HAS_GENRE",
  scene: "BELONGS_TO_SCENE",
};

const LABEL_FOR: Record<string, string> = {
  theme: "téma",
  mood: "nálada",
  style: "styl",
  genre: "žánr",
  scene: "scéna",
};

/** Skloňování: "s tímto <tvarem>" (instrumentál). */
const INSTR_FOR: Record<string, string> = {
  theme: "tématem",
  mood: "náladou",
  style: "stylem",
  genre: "žánrem",
  scene: "scénou",
};

const ROUTE_FOR: Record<string, string> = {
  theme: "temata",
  mood: "nalady",
  style: "styly",
  genre: "zanry",
  scene: "sceny",
};


// ─── Detekce: má entita už kvalitní obsah? ─────────────────────────────────
/** Přečte entity.mdx z disku a spočítá tělo bez frontmatteru. */
function existingBodyLength(id: string): number {
  const p = path.join(ENTITIES, id, "entity.mdx");
  if (!fs.existsSync(p)) return 0;
  const raw = fs.readFileSync(p, "utf8");
  // Odstraň frontmatter (--- ... ---)
  const fm = raw.match(/^---[\s\S]*?---\n?/);
  const body = fm ? raw.slice(fm[0].length) : raw;
  // Odstraň markdown nadpisy a whitespace — co zbývá, je skutečný obsah
  return body.replace(/^#+\s.*$/gm, "").replace(/\s+/g, " ").trim().length;
}

// ─── Načtení cache ─────────────────────────────────────────────────────────
const ents: Record<string, any> = JSON.parse(
  fs.readFileSync(path.join(ROOT, ".content-cache", "entities.json"), "utf8"),
);
const graph: any[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, ".content-cache", "graph.json"), "utf8"),
);

const outIdx = new Map<string, any[]>();
const inIdx = new Map<string, any[]>();
for (const x of graph) {
  const o = outIdx.get(x.from) ?? [];
  o.push(x);
  outIdx.set(x.from, o);
  const i = inIdx.get(x.to) ?? [];
  i.push(x);
  inIdx.set(x.to, i);
}

const titleOf = (id: string) => ents[id]?.title ?? id;
const slugOf = (id: string) => ents[id]?.slug ?? id.replace(/^[a-z]+_/, "");
const routeOf = (id: string) => {
  const t = ents[id]?.type;
  const slug = slugOf(id);
  if (t === "artist") return `/raperi/${slug}`;
  if (t === "track") return `/skladby/${slug}`;
  if (t === "album") return `/alba/${slug}`;
  const r = ROUTE_FOR[t as string];
  return r ? `/${r}/${slug}` : `/${t}/${slug}`;
};

/** Spočítá statistiky pro taxonomii. */
function statsFor(id: string, type: string) {
  const rel = REL_FOR[type];
  const allRefs = (inIdx.get(id) ?? []).filter((x) => x.relation === rel).map((x) => x.from);
  // POZOR: HAS_THEME/HAS_MOOD mají i alba a artisti. Pro "skladby" bereme JEN tracky.
  const trackIds = allRefs.filter((t) => ents[t]?.type === "track");
  const albumRefs = allRefs.filter((t) => ents[t]?.type === "album");

  const artistCount = new Map<string, number>();
  const albumSet = new Set<string>(albumRefs);
  for (const t of trackIds) {
    for (const e of outIdx.get(t) ?? []) {
      if (e.relation === "HAS_ARTIST" && ents[e.to]?.type === "artist") {
        artistCount.set(e.to, (artistCount.get(e.to) ?? 0) + 1);
      }
      if (e.relation === "BELONGS_TO_ALBUM" && ents[e.to]?.type === "album") {
        albumSet.add(e.to);
      }
    }
  }

  // Top skladby = tracky s nejbohatším obsahem (ukázka). POZOR: jen tracky!
  const richTracks = trackIds
    .filter((t) => (ents[t]?.content ?? "").length > 800)
    .sort((a, b) => (ents[b]?.content ?? "").length - (ents[a]?.content ?? "").length)
    .slice(0, 5);

  const topArtists = [...artistCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    trackCount: trackIds.length,
    richCount: trackIds.filter((t) => (ents[t]?.content ?? "").length > 800).length,
    albumCount: albumSet.size,
    artistCount: artistCount.size,
    topArtists,
    sampleTracks: richTracks,
  };
}

/** Vygeneruje MDX pro taxonomii. Pouze fakta z dat. */
function mdxFor(id: string, type: string, s: ReturnType<typeof statsFor>): string {
  const e = ents[id];
  const label = LABEL_FOR[type];
  const parts: string[] = [];

  // 1) Kontext — z existujícího popisu, pokud není generický stub
  const desc = (e.description ?? "").trim();
  const isStub = /stub|bude doplněn|<Typ>|^Téma |^Mood |^Styl |^Scéna |^Žánr /i.test(desc);
  if (desc && !isStub && desc.length > 40) {
    parts.push(`## Kontext\n\n${desc}`);
  } else {
    parts.push(
      `## Kontext\n\n**${e.title}** je ${label} v databázi české a slovenské rapové scény. ` +
        `V naší databázi se s ním pojí **${s.trackCount} skladeb** od **${s.artistCount} interpretů**.`,
    );
  }

  // 2) Statistiky — reálná čísla
  parts.push(
    `## Zastoupení\n\n` +
      `- **${s.trackCount} skladeb** s tímto ${INSTR_FOR[type]}\n` +
      `- **${s.artistCount} interpretů**\n` +
      `- **${s.albumCount} alb**`,
  );

  // 3) Top interpreti — s odkazy
  if (s.topArtists.length) {
    const list = s.topArtists
      .map(([aid, n]) => `[${titleOf(aid)}](${routeOf(aid)}) (${n})`)
      .join(", ");
    parts.push(`## Nejčastější interpreti\n\n${list}`);
  }

  // 4) Ukázkové skladby — s odkazy
  if (s.sampleTracks.length) {
    const list = s.sampleTracks
      .map((tid) => `- [${titleOf(tid)}](${routeOf(tid)}) — ${artistLineFor(tid)}${albumLineFor(tid)}`)
      .join("\n");
    parts.push(`## Ukázkové skladby\n\n${list}`);
  }

  return parts.join("\n\n") + "\n";
}

/** " (album Y)" pokud skladba patří k albu. */
function albumLineFor(trackId: string): string {
  const al = (outIdx.get(trackId) ?? []).find(
    (x) => x.relation === "BELONGS_TO_ALBUM" && ents[x.to]?.type === "album",
  );
  return al ? ` (album ${titleOf(al.to)})` : "";
}

/** "od X" nebo "X feat. Y" pro skladbu. */
function artistLineFor(trackId: string): string {
  const artists = (outIdx.get(trackId) ?? [])
    .filter((x) => x.relation === "HAS_ARTIST")
    .map((x) => titleOf(x.to));
  if (!artists.length) return "neznámý interpret";
  const feats = (outIdx.get(trackId) ?? [])
    .filter((x) => x.relation === "FEATURES")
    .map((x) => titleOf(x.to));
  if (feats.length) return `${artists[0]} feat. ${feats.join(", ")}`;
  return artists[0];
}

// ─── Main ──────────────────────────────────────────────────────────────────
const types = ONLY_TYPE ? [ONLY_TYPE] : Object.keys(REL_FOR);
const results: { id: string; type: string; title: string; len: number; tracks: number; skip?: string }[] = [];
let protectedCount = 0;

for (const type of types) {
  for (const e of Object.values(ents).filter((x: any) => x.type === type)) {
    // GATE 0: ochrana původního obsahu (content-guard).
    // BOHATÝ obsah (>=600 B) se NIKDY nepřepíše — ani s FORCE.
    // Střední obsah vyžaduje FORCE + I_KNOW_WHAT_I_DO=1.
    const guard = mayOverwrite(ENTITIES, e.id, {
      force: FORCE,
      allowRich: process.env.ALLOW_RICH === "1",
      confirmed: process.env.I_KNOW_WHAT_I_DO === "1",
    });
    if (!guard.allowed) {
      results.push({ id: e.id, type, title: e.title, len: guard.currentLength, tracks: 0, skip: "chráníno" });
      continue;
    }
    const bodyLen = guard.currentLength;
    if (guard.currentLength > 0) protectedCount++;

    const s = statsFor(e.id, type);
    // GATE 1: bez dost dat = prázdná stránka → přeskočit
    if (s.trackCount < 3) {
      results.push({ id: e.id, type, title: e.title, len: 0, tracks: s.trackCount, skip: "málo skladeb" });
      continue;
    }
    const mdx = mdxFor(e.id, type, s);
    results.push({ id: e.id, type, title: e.title, len: mdx.length, tracks: s.trackCount });
    if (DRY_RUN) continue;

    const dir = path.join(ENTITIES, e.id);
    if (!fs.existsSync(dir)) continue;
    fs.writeFileSync(path.join(dir, "entity.mdx"), mdx);

    // Update meta: description (lepší) + noindex pryč (má obsah)
    const metaPath = path.join(dir, "meta.json");
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    const descOk = meta.description && !/stub|bude doplněn|^Téma |^Mood |^Styl |^Scéna |^Žánr |— náladu|— téma v/i.test(meta.description);
    meta.description = descOk
      ? meta.description
      : `${e.title} — ${LABEL_FOR[type]} v českém a slovenském rapu: ${s.trackCount} skladeb od ${s.artistCount} interpretů.`;
    if (meta.extraMeta?.noindex === true) delete meta.extraMeta.noindex;
    // Stale stub flagy zablokují indexaci i u bohatého obsahu → smazat.
    // Pozor: isStub/stubReason jsou na TOP-LEVEL meta.json (ne v extraMeta).
    if (meta.extraMeta?.isStub === true) delete meta.extraMeta.isStub;
    if (meta.extraMeta?.phase3GateFail) delete meta.extraMeta.phase3GateFail;
    if (meta.isStub === true) delete meta.isStub;
    if (meta.stubReason) delete meta.stubReason;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  }
}

// ─── Report ────────────────────────────────────────────────────────────────
const ok = results.filter((r) => !r.skip);
const skipped = results.filter((r) => r.skip);
console.log(`Typy: ${types.join(", ")}`);
const protectedN = skipped.filter(r=>r.skip==="chráníno");
const tooFew = skipped.filter(r=>r.skip==="málo skladeb");
console.log(`Celkem: ${results.length} | obohaceno: ${ok.length} | ochráněno (má obsah): ${protectedN.length} | málo dat: ${tooFew.length}`);
console.log(`Ø obsah: ${Math.round(ok.reduce((s, r) => s + r.len, 0) / (ok.length || 1))} znaků\n`);
console.log("Vzorek (top 15 podle skladeb):");
for (const r of ok.sort((a, b) => b.tracks - a.tracks).slice(0, 15)) {
  console.log(`  ${String(r.tracks).padStart(4)} skl | ${r.len}B | ${r.type.padEnd(6)} ${r.title}`);
}
if (skipped.length) {
  console.log(`\nPřeskočeno (málo dat — zůstane noindex/prázdné):`);
  for (const r of skipped.slice(0, 10)) console.log(`  ${r.tracks} skl | ${r.type.padEnd(6)} ${r.title}`);
}

if (DRY_RUN) {
  console.log("\n[DRY-RUN] Nic nezapsáno. DRY_RUN=0 pro zápis.");
}
