// ═══════════════════════════════════════════════════════════════
// VRSTVA 2 — Grounding context builder
//
// Ze schválených entit postaví kontext pro LLM.
// LLM vidí JEN tyto entity → nemá odkud vymyslet nic jiného.
// ═══════════════════════════════════════════════════════════════

import type { CacheEntities } from "@/lib/content/cache-builder";
import type { GraphEdge } from "@/lib/content/types";
import type { GroundingContext, ResolvedEntity } from "./types";

/** URL entitní stránky podle typu. */
export function entityUrl(type: string, slug: string): string {
  switch (type) {
    case "artist": return `/raperi/${slug}`;
    case "track": return `/skladby/${slug}`;
    case "album": return `/alba/${slug}`;
    case "genre": return `/zanry/${slug}`;
    case "style": return `/styly/${slug}`;
    case "theme": return `/temata/${slug}`;
    case "mood": return `/nalady/${slug}`;
    case "producer": return `/producenti/${slug}`;
    case "label": return `/labely/${slug}`;
    case "location": return `/lokality/${slug}`;
    case "article": return `/clanky/${slug}`;
    default: return `/${type}/${slug}`;
  }
}

export interface GraphIndex {
  out: Map<string, GraphEdge[]>;
  in: Map<string, GraphEdge[]>;
}

export function buildGraphIndex(graph: GraphEdge[]): GraphIndex {
  const out = new Map<string, GraphEdge[]>();
  const inp = new Map<string, GraphEdge[]>();
  for (const g of graph) {
    let a = out.get(g.from);
    if (!a) { a = []; out.set(g.from, a); }
    a.push(g);
    let b = inp.get(g.to);
    if (!b) { b = []; inp.set(g.to, b); }
    b.push(g);
  }
  return { out, in: inp };
}

function titleOf(entities: CacheEntities, id: string): string {
  return entities[id]?.title ?? id;
}

/**
 * Spočítá skutečné společné skladby mezi `artistId` a každým dalším umělcem.
 *
 * Spolupráce = skladba, kde je `artistId` primární interpret (HAS_ARTIST) nebo
 * host (FEATURES) A ZÁROVEŇ je tam i druhý umělec v jedné z těchto rolí.
 *
 * Toto je jediná správná definice „spolupráce" — RELATED_TO se ignoruje,
 * protože je to jen grafová blízkost (žánr, label, město…), ne feat.
 */
function computeCollabCounts(
  artistId: string,
  artistIds: Set<string>,
  entities: CacheEntities,
  gi: GraphIndex,
): Map<string, number> {
  const counts = new Map<string, number>();

  // Skladby, kde je `artistId` v nějaké roli (primární i host).
  const involved = new Set<string>();
  for (const e of [...(gi.in.get(artistId) ?? []), ...(gi.out.get(artistId) ?? [])]) {
    if (e.relation === "HAS_ARTIST" || e.relation === "FEATURES") {
      const trackId = e.from === artistId ? e.to : e.from;
      if (entities[trackId]?.type === "track") involved.add(trackId);
    }
  }
  if (involved.size === 0) return counts;

  for (const trackId of involved) {
    const tr = entities[trackId];
    if (!tr) continue;
    const ob = tr.outbound ?? {};
    const roles = new Set<string>([
      ...((ob.HAS_ARTIST as string[] | undefined) ?? []),
      ...((ob.FEATURES as string[] | undefined) ?? []),
    ]);
    for (const other of roles) {
      if (other === artistId) continue;
      if (!artistIds.has(other)) continue;
      if (!entities[other] || entities[other].type !== "artist") continue;
      counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Deterministicky spočítané hodnoty — LLM je jen zopakuje.
 * Tím se číselné dotazy ("kolik", "s kým nejčastěji") nehalucinují.
 */
export function computeFacts(
  entities: CacheEntities,
  gi: GraphIndex,
  focus: ResolvedEntity[],
): string {
  const lines: string[] = [];
  for (const f of focus) {
    if (f.type !== "artist") continue;

    // Tracky, kde je interpret primary artist (HAS_ARTIST = in-hrana na artista)
    const primaryTracks = (gi.in.get(f.id) ?? []).filter((e) => e.relation === "HAS_ARTIST");
    // Feat hostování (FEATURES = in-hrana z tracku na artista)
    const feats = (gi.in.get(f.id) ?? []).filter((e) => e.relation === "FEATURES");

    lines.push(
      `${f.title}: ${primaryTracks.length} vlastních skladeb, ${feats.length} hostování v cizích skladbách.`,
    );

    // ── Skutečné spolupráce: průnik skladeb (HAS_ARTIST / FEATURES) ──────
    // POZOR: RELATED_TO je jen „podobný/spřízněný" hrana — NENÍ to feat.
    // Počítat spolupráci z RELATED_TO vede k nesmyslům (6 „spolupracovníků",
    // kteří spolu nikdy nic nenahráli). Skutečná spolupráce = sdílená skladba.
    const artistIds = new Set<string>();
    for (const id of Object.keys(entities)) {
      if (entities[id]?.type === "artist" && id !== f.id) artistIds.add(id);
    }
    const collabs = computeCollabCounts(f.id, artistIds, entities, gi);
    if (collabs.size) {
      const sorted = [...collabs.entries()].sort((a, b) => b[1] - a[1]);
      const max = sorted[0][1];
      const top = sorted.filter(([, c]) => c === max).map(([id]) => titleOf(entities, id));
      lines.push(
        `  Spolupracovníci podle společných skladeb (${sorted.length}): ${sorted
          .map(([id, c]) => `${titleOf(entities, id)} (${c} skl.)`)
          .join(", ")}.`,
      );
      lines.push(`  Nejvíc společných skladeb (${max}): ${top.join(", ")}.`);
    } else {
      lines.push("  Žádné doložené společné skladby s jiným umělcem v datech.");
    }
  }
  return lines.join("\n");
}

/**
 * Postaví grounding kontext z focus entit a jejich sousedů.
 * `allowedIds` = whitelist, který pak validace použije.
 */
export function buildGrounding(
  entities: CacheEntities,
  gi: GraphIndex,
  focus: ResolvedEntity[],
  opts: { maxNeighbors?: number; contentChars?: number } = {},
): GroundingContext {
  const maxNeighbors = opts.maxNeighbors ?? 40;
  const contentChars = opts.contentChars ?? 1400;

  const allowedIds = new Set<string>(focus.map((f) => f.id));
  const parts: string[] = [];

  // 1) Focus entity s obsahem
  for (const f of focus) {
    const e = entities[f.id];
    if (!e) continue;
    const url = entityUrl(e.type, e.slug);
    parts.push(
      `### ${e.title} (${e.type}, id: ${e.id})\nURL: ${url}\n${(e.content || e.description || "").slice(0, contentChars)}`,
    );
  }

  // 2) Sousedé z grafu (whitelistováni, aby LLM mohl citovat i je)
  const edges: string[] = [];
  let n = 0;
  const seen = new Set<string>();
  for (const f of focus) {
    const all = [...(gi.out.get(f.id) ?? []), ...(gi.in.get(f.id) ?? [])];
    for (const e of all) {
      if (n >= maxNeighbors) break;
      const key = `${e.from}|${e.relation}|${e.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      n++;
      const other = e.from === f.id ? e.to : e.from;
      const otherEnt = entities[other];
      if (otherEnt) {
        allowedIds.add(other);
        // Přidej i krátký popis souseda (aby LLM věděl, co to je)
        const nt = otherEnt.title;
        edges.push(`${titleOf(entities, e.from)} —[${e.relation}]→ ${titleOf(entities, e.to)}`);
        if (!parts.some((p) => p.startsWith(`### ${nt} `))) {
          parts.push(`### ${nt} (${otherEnt.type}, id: ${other})\nURL: ${entityUrl(otherEnt.type, otherEnt.slug)}\n${(otherEnt.description || "").slice(0, 200)}`);
        }
      } else {
        edges.push(`${titleOf(entities, e.from)} —[${e.relation}]→ ${titleOf(entities, e.to)}`);
      }
    }
  }

  const allowedUrls = new Set<string>();
  for (const id of allowedIds) {
    const e = entities[id];
    if (e) allowedUrls.add(entityUrl(e.type, e.slug));
  }

  return {
    text: parts.join("\n\n"),
    edges: edges.join("\n"),
    computed: computeFacts(entities, gi, focus),
    allowedIds,
    allowedUrls,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBÁLNÍ STATISTIKY — pro agregované dotazy ("kdo má nejvíc tracků", ...)
//
// Deterministicky spočítané z grafu + entit. LLM je jen zopakuje, takže
// agregované číselné dotazy nehalucinují. Vrací kompaktní text pro DATA sekci.
// ═══════════════════════════════════════════════════════════════════════════

function topN(
  counts: Map<string, number>,
  entities: CacheEntities,
  n: number,
): { text: string; ids: string[] } {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return { text: "žádná data", ids: [] };
  const top = sorted.slice(0, n);
  return {
    text: top.map(([id, c]) => `${entities[id]?.title ?? id} (${c})`).join(", "),
    ids: top.map(([id]) => id),
  };
}

export interface GlobalStats {
  text: string;
  mentionedIds: string[];
}

export function computeGlobalStats(
  entities: CacheEntities,
  gi: GraphIndex,
): GlobalStats {
  const trackCountByArtist = new Map<string, number>();
  const albumCountByArtist = new Map<string, number>();

  // Počty: HAS_ARTIST (track→artist), HAS_ALBUM (artist→album)
  for (const id of Object.keys(entities)) {
    const type = entities[id]?.type;
    if (type === "artist") {
      // alba přes out HAS_ALBUM
      const hasAlbum = (gi.out.get(id) ?? []).filter((e) => e.relation === "HAS_ALBUM");
      albumCountByArtist.set(id, hasAlbum.length);
      // tracky přes in HAS_ARTIST
      const hasArtist = (gi.in.get(id) ?? []).filter((e) => e.relation === "HAS_ARTIST");
      trackCountByArtist.set(id, hasArtist.length);
    }
  }

  // Nejstarší / nejnovější album + track (podle publishedAt)
  let oldestAlbum: { id: string; d: string } | null = null;
  let newestAlbum: { id: string; d: string } | null = null;
  let oldestTrack: { id: string; d: string } | null = null;
  for (const id of Object.keys(entities)) {
    const e = entities[id];
    const d = e?.publishedAt;
    if (!d) continue;
    if (e.type === "album") {
      if (!oldestAlbum || d < oldestAlbum.d) oldestAlbum = { id, d };
      if (!newestAlbum || d > newestAlbum.d) newestAlbum = { id, d };
    } else if (e.type === "track") {
      if (!oldestTrack || d < oldestTrack.d) oldestTrack = { id, d };
    }
  }

  const topTracks = topN(trackCountByArtist, entities, 10);
  const topAlbums = topN(albumCountByArtist, entities, 10);

  const lines: string[] = [];
  lines.push(`Interpreti s nejvíce skladbami: ${topTracks.text}.`);
  lines.push(`Interpreti s nejvíce alby: ${topAlbums.text}.`);
  if (oldestAlbum) lines.push(`Nejstarší album v DB: ${entities[oldestAlbum.id]?.title} (${oldestAlbum.d}).`);
  if (newestAlbum) lines.push(`Nejnovější album v DB: ${entities[newestAlbum.id]?.title} (${newestAlbum.d}).`);
  if (oldestTrack) lines.push(`Nejstarší skladba v DB: ${entities[oldestTrack.id]?.title} (${oldestTrack.d}).`);

  const mentionedIds = new Set<string>([
    ...topTracks.ids,
    ...topAlbums.ids,
  ]);
  if (oldestAlbum) mentionedIds.add(oldestAlbum.id);
  if (newestAlbum) mentionedIds.add(newestAlbum.id);
  if (oldestTrack) mentionedIds.add(oldestTrack.id);

  return { text: lines.join("\n"), mentionedIds: [...mentionedIds] };
}
