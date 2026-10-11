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

/** Vztahy, které smysluplně odpovídají na dotazy o spolupráci. */
const COLLAB_RELATIONS = new Set(["RELATED_ARTIST", "RELATED_TO", "FEATURES"]);

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

    // Kolaborace s počty
    const counts = new Map<string, number>();
    for (const e of gi.out.get(f.id) ?? []) {
      if (COLLAB_RELATIONS.has(e.relation)) {
        // pouze artisté (ne alba/lokality, které se pletou do RELATED_TO)
        if (entities[e.to]?.type !== "artist") continue;
        counts.set(e.to, (counts.get(e.to) ?? 0) + 1);
      }
    }
    if (counts.size) {
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const max = sorted[0][1];
      const top = sorted.filter(([, c]) => c === max).map(([id]) => titleOf(entities, id));
      lines.push(
        `  Spolupracovníci (${counts.size}): ${sorted
          .map(([id, c]) => `${titleOf(entities, id)}${c > 1 ? ` (${c}×)` : ""}`)
          .join(", ")}.`,
      );
      lines.push(`  Nejčastěji (${max}×): ${top.join(", ")}.`);
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
