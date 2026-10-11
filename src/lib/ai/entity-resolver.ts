// ═══════════════════════════════════════════════════════════════
// VRSTVA 1 — Entity resolver
//
// Z dotazu vytáhne, na které entity se uživatel ptá.
// Slouží jako "negativní důkaz": pokud dotaz míří na entitu,
// která v DB není → tvrdé odmítnutí (LLM se vůbec nevolá).
// ═══════════════════════════════════════════════════════════════

import type { CacheEntities } from "@/lib/content/cache-builder";
import type { ResolvedEntity } from "./types";

/** Slova, která nenesou informaci o entitě. */
const STOPWORDS = new Set([
  "s", "kym", "kdo", "kolik", "ma", "jak", "jaky", "jake", "jsou", "je",
  "o", "cem", "od", "na", "do", "v", "ve", "z", "ze", "a", "i", "the",
  "nejlepsi", "nejlepsi", "nejcasteji", "nejvetsi", "spolupracoval",
  "spoluprace", "tracky", "track", "skladby", "skladba", "alba", "album",
  "ceske", "cesky", "ceska", "slovenske", "scene", "scena", "zanr", "zanry",
  "delа", "dela", "kdy", "vysel", "vysla", "vyslo", "rok", "roku",
]);

export function normalizeText(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface ResolverIndex {
  /** normalizovaný title → ID entit */
  byTitle: Map<string, string[]>;
  /** slug → ID */
  bySlug: Map<string, string>;
  /** všechny dokumenty pro full-text */
  docs: { id: string; type: string; title: string; slug: string; normTitle: string; hay: string }[];
}

/** Postaví index jednou (memoizovat na volajícím). */
export function buildResolverIndex(entities: CacheEntities): ResolverIndex {
  const byTitle = new Map<string, string[]>();
  const bySlug = new Map<string, string>();
  const docs: ResolverIndex["docs"] = [];
  for (const e of Object.values(entities)) {
    const nt = normalizeText(e.title);
    if (nt) {
      const arr = byTitle.get(nt) ?? [];
      arr.push(e.id);
      byTitle.set(nt, arr);
    }
    if (e.slug) bySlug.set(e.slug, e.id);
    docs.push({
      id: e.id,
      type: e.type,
      title: e.title,
      slug: e.slug,
      normTitle: nt,
      hay: `${nt} ${normalizeText(e.description ?? "")}`,
    });
  }
  return { byTitle, bySlug, docs };
}

/** Extrahuj kandidátní jména z dotazu (bez stopwords). */
export function extractTerms(question: string): string[] {
  return normalizeText(question)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Rezolvuj entity zmíněné v dotazu.
 *
 * Vrací vždy to, co uživatel zmínil (i s malým skóre), aby šlo
 * rozhodnout "entita existuje / neexistuje".
 */
export function resolveEntities(
  question: string,
  index: ResolverIndex,
  limit = 5,
): ResolvedEntity[] {
  const terms = extractTerms(question);
  const fullNorm = normalizeText(question);
  const found = new Map<string, ResolvedEntity>();

  const consider = (id: string, score: number, via: ResolvedEntity["via"]) => {
    const prev = found.get(id);
    if (!prev || prev.score < score) {
      const d = index.docs.find((x) => x.id === id);
      if (d) found.set(id, { id, type: d.type, title: d.title, slug: d.slug, score, via });
    }
  };

  // 1) Celá fráze = přesný název entity
  const exact = index.byTitle.get(fullNorm);
  if (exact) for (const id of exact) consider(id, 100, "exact");

  // 2) Jednotlivá slova
  for (const t of terms) {
    const exactWord = index.byTitle.get(t);
    if (exactWord) for (const id of exactWord) consider(id, 60, "exact");

    }

  // 3) Dvojslovné fráze (např. "vladimir 518")
  for (let i = 0; i < terms.length - 1; i++) {
    const bigram = `${terms[i]} ${terms[i + 1]}`;
    const hit = index.byTitle.get(bigram);
    if (hit) for (const id of hit) consider(id, 80, "exact");
  }

  // 4) Částečná shoda — jen pro termy > 3 znaky (proti falešným pozitivům)
  for (const t of terms) {
    if (t.length <= 3) continue;
    for (const d of index.docs) {
      if (d.normTitle.startsWith(t) && d.normTitle.length <= t.length + 6) {
        consider(d.id, 40, "partial");
      }
    }
  }

  return [...found.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
