// ═══════════════════════════════════════════════════════════════
// RAPENGINE — Common Ground
//
// „Co mají dva rappeři společného?"
//
// Pure funkce (bez Reactu, bez fetche) — vstupem jsou dva entity
// záznamy (z cache / search-indexu), výstupem strukturované přímé
// shody. Nepřímé propojení (BFS přes RELATED_TO) je vědomě mimo v1.
// ═══════════════════════════════════════════════════════════════

/** Skladba pro sekci „Společné skladby". */
export interface SharedTrack {
  id: string;
  title: string;
  /** URL na detail skladby. */
  url: string;
  /** Kdo ji má jako primární (title), pokud známo. */
  primaryTitle?: string;
  /** Role: primary | feature | both */
  roleA: "primary" | "feature" | "both";
  roleB: "primary" | "feature" | "both";
}

/** Minimální tvar entity, který Common Ground potřebuje. */
export interface CommonGroundEntity {
  id: string;
  type: string;
  slug: string;
  title: string;
  image?: string | null;
  outbound?: Record<string, string[]>;
}

/** Jedna skupina shod (např. „Společné žánry"). */
export interface CommonGroundGroup {
  /** Stabilní klíč skupiny (pro React key / testy). */
  key: string;
  /** Český název skupiny. */
  label: string;
  /** Sdílené položky (entity refs). */
  items: CommonGroundItem[];
}

export interface CommonGroundItem {
  id: string;
  title: string;
  /** URL na detail entity (Czech route). */
  url: string;
}

export interface CommonGroundResult {
  /** Skupiny s ≥1 shodou, seřazené podle relevantnosti. */
  groups: CommonGroundGroup[];
  /** Celkový počet přímých shod (součet délek skupin + skladby). */
  totalShared: number;
  /** True, když entity nemají žádnou přímou shodu. */
  isEmpty: boolean;
}

/** Popisek skupiny + kterou outbound relaci mapuje + jak řadit. */
interface GroupSpec {
  key: string;
  label: string;
  relations: string[];
  /** Priorita ve výsledku (nižší = výš). */
  order: number;
}

/**
 * Vážené skupiny shod. Pořadí odpovídá tomu, co uživatele zajímá nejvíc:
 * společný žánr/styl/nálada („dělají podobnou muziku") > label/scéna
 * („pohybují se ve stejných kruzích") > město („odkud jsou").
 */
const GROUP_SPECS: GroupSpec[] = [
  { key: "genres", label: "Společné žánry", relations: ["HAS_GENRE"], order: 1 },
  { key: "styles", label: "Společné styly", relations: ["HAS_STYLE"], order: 2 },
  { key: "moods", label: "Společné nálady", relations: ["HAS_MOOD"], order: 3 },
  { key: "themes", label: "Společná témata", relations: ["HAS_THEME"], order: 4 },
  { key: "labels", label: "Společné labely", relations: ["RELEASED_BY", "SIGNED_TO"], order: 5 },
  { key: "scenes", label: "Společné scény", relations: ["BELONGS_TO_SCENE"], order: 6 },
  { key: "locations", label: "Společné lokality", relations: ["ORIGINATES_FROM"], order: 7 },
];

/** Czech URL prefixes — zrcadlí TYPE_ROUTE_MAP, ale bez server-only importu. */
const ROUTE_PREFIX: Record<string, string> = {
  artist: "/raperi",
  album: "/alba",
  track: "/skladby",
  genre: "/zanry",
  style: "/styly",
  theme: "/temata",
  mood: "/nalady",
  scene: "/sceny",
  label: "/labely",
  location: "/lokality",
  article: "/clanky",
  collective: "/kolektivy",
  producer: "/producenti",
  event: "/akce",
};

/** Vytáhne ID pro dané relace z outbound mapy entity. */
function idsFor(entity: CommonGroundEntity, relations: string[]): Set<string> {
  const out = new Set<string>();
  for (const rel of relations) {
    for (const id of entity.outbound?.[rel] ?? []) out.add(id);
  }
  return out;
}

/**
 * Vypočítá přímé shody mezi dvěma entitami.
 *
 * @param a        první entita (typicky artist)
 * @param b        druhá entita
 * @param resolve  funkce `id → entity` pro získání titulku/typu shod.
 *                 Když vrátí undefined, položka se přeskočí.
 */
export function computeCommonGround(
  a: CommonGroundEntity,
  b: CommonGroundEntity,
  resolve: (id: string) => CommonGroundEntity | undefined,
): CommonGroundResult {
  const groups: CommonGroundGroup[] = [];

  for (const spec of GROUP_SPECS) {
    const aIds = idsFor(a, spec.relations);
    const bIds = idsFor(b, spec.relations);

    const shared: CommonGroundItem[] = [];
    for (const id of aIds) {
      if (!bIds.has(id)) continue;
      const entity = resolve(id);
      if (!entity) continue;
      const prefix = ROUTE_PREFIX[entity.type] ?? `/${entity.type}`;
      shared.push({
        id: entity.id,
        title: entity.title,
        url: `${prefix}/${entity.slug}`,
      });
    }

    if (shared.length > 0) {
      shared.sort((x, y) => x.title.localeCompare(y.title, "cs"));
      groups.push({ key: spec.key, label: spec.label, items: shared });
    }
  }

  groups.sort((x, y) => {
    const sx = GROUP_SPECS.find((s) => s.key === x.key)?.order ?? 99;
    const sy = GROUP_SPECS.find((s) => s.key === y.key)?.order ?? 99;
    return sx - sy;
  });

  const totalShared = groups.reduce((sum, g) => sum + g.items.length, 0);

  return { groups, totalShared, isEmpty: totalShared === 0 };
}

/**
 * Vypočítá SPOLEČNÉ SKLADBY dvou umělců.
 *
 * Skladba se počítá, když je umělec její primární interpret (HAS_ARTIST)
 * nebo host (FEATURES). Hledá průnik množin skladeb obou umělců.
 *
 * @param aId      ID umělce A
 * @param bId      ID umělce B
 * @param tracks   všechny entity typu `track` (s outbound)
 * @param resolve  id → entita (pro titulek primárního interpreta)
 */
export function computeSharedTracks(
  aId: string,
  bId: string,
  tracks: CommonGroundEntity[],
  resolve: (id: string) => CommonGroundEntity | undefined,
): SharedTrack[] {
  const roleOf = (
    t: CommonGroundEntity,
    artistId: string,
  ): "primary" | "feature" | "both" | null => {
    const ob = t.outbound ?? {};
    const isPrimary = (ob.HAS_ARTIST ?? []).includes(artistId);
    const isFeature = (ob.FEATURES ?? []).includes(artistId);
    if (isPrimary && isFeature) return "both";
    if (isPrimary) return "primary";
    if (isFeature) return "feature";
    return null;
  };

  const shared: SharedTrack[] = [];
  for (const t of tracks) {
    const roleA = roleOf(t, aId);
    if (!roleA) continue;
    const roleB = roleOf(t, bId);
    if (!roleB) continue;

    const primaryId = (t.outbound?.HAS_ARTIST ?? [])[0];
    const primary = primaryId ? resolve(primaryId) : undefined;

    shared.push({
      id: t.id,
      title: t.title,
      url: `/skladby/${t.slug}`,
      primaryTitle: primary?.title,
      roleA,
      roleB,
    });
  }

  shared.sort((x, y) => x.title.localeCompare(y.title, "cs"));
  return shared;
}

/** Český popis role umělce na skladbě. */
export function trackRoleLabel(role: SharedTrack["roleA"]): string {
  if (role === "both") return "host i autor";
  if (role === "primary") return "autor";
  return "host";
}

/**
 * Krátké slovní hodnocení shody — pro „verdict" nad výsledky.
 * Deterministické (žádná náhoda), aby se dalo testovat.
 *
 * Vychází ze SKÓRE podobnosti (vážené) + počtu společných skladeb, ne
 * z hrubého součtu vazeb. Proč: „oba dělají rap" dá velký hrubý součet,
 * ale slabou shodu — fráze by neměla tvrdit „dvojčata", když se jen oba
 * pohybují v rapu. Společná skladba je naopak silný signál.
 */
export function commonGroundVerdict(
  result: CommonGroundResult,
  score: number,
  sharedTracksCount: number,
): string {
  if (score === 0 && sharedTracksCount === 0) {
    return "Žádná přímá shoda — každý jede úplně jinou cestu.";
  }
  // Společná skladba je silnější důkaz než jakýkoliv počet žánrových shod.
  if (sharedTracksCount > 0 && score < 25) {
    return "Nahráli spolu, ale žánrově se rozešli.";
  }
  if (score < 20) return "Spíš vzdálení — jen okrajové překryvy.";
  if (score < 40) return "Pár společných vlivů, ale každý jde vlastní cestou.";
  if (score < 60) return "Viditelný překryv — podobná témata i zvuk.";
  if (score < 80) return "Silný překryv, ale pořád si drží vlastní styl.";
  return "Velmi blízcí — stejné kruhy, podobný výraz.";
}

// ═══════════════════════════════════════════════════════════════════════════
// FÁZE 5 — Nepřímé propojení (BFS „spojuje je X")
//
// Když dva rappeři nemají žádnou přímou shodu (žádná společná skladba,
// žánr, label…), najde nejkratší cestu v grafu spolupráce. Např.:
//   Yzomandias → hostoval u Viktora Sheena → Viktor Sheen feat. Calin
//
// Graf spolupráce je sestavený z relací:
//   RELATED_TO / RELATED_ARTIST  (artist → artist, „spolupracoval s")
//   HAS_ARTIST / FEATURES        (track → artist, přes sdílenou skladbu)
// ═══════════════════════════════════════════════════════════════════════════

/** Jeden krok nepřímé cesty: „A se propojí s B přes X". */
export interface IndirectHop {
  /** ID entity, přes kterou se propojili (společný kontakt / skladba). */
  viaId: string;
  /** Titulek té entity (pro zobrazení). */
  viaTitle: string;
  /** URL na detail entity. */
  viaUrl: string;
  /** Popis vztahu: „spolupracoval s" / „hostoval na" / „nahrál s". */
  label: string;
  /** Z kterého ID krok vychází. */
  fromId: string;
  /** Do kterého ID krok vede. */
  toId: string;
}

/** Výsledek nepřímého propojení dvou umělců. */
export interface IndirectPath {
  /** Délka cesty v krocích (počet hopů). 1 = jeden společný kontakt. */
  length: number;
  /** Jednotlivé kroky cesty (seřazené od A k B). */
  hops: IndirectHop[];
}

/**
 * Relace, přes které se dá „propojit" dva umělce. Řazeno podle síly
 * důkazu spolupráce: přímý vztah (RELATED_TO) je nejsilnější, pak
 * sdílená skladba (FEATURES/HAS_ARTIST).
 */
const INDIRECT_RELATIONS: Record<string, string> = {
  RELATED_TO: "spolupracoval s",
  RELATED_ARTIST: "spolupracoval s",
  FEATURES: "hostoval na",
  HAS_ARTIST: "nahrál s",
};

/**
 * Vypočítá nejkratší nepřímou cestu mezi dvěma umělci.
 *
 * Prohledává graf do šířky (BFS) z A i z B zároveň (bidirectional), aby
 * byl rychlý i na velkém grafu. Hledá jen cesty, kde je každý krok
 * „spolupráce" — buď přímá vazba artist→artist (RELATED_TO), nebo
 * sdílená skladba (track, na kterém se oba podíleli).
 *
 * @param aId       ID umělce A
 * @param bId       ID umělce B
 * @param outbound  adjacency mapa: id → (relace → [id]). Obsahuje artisty
 *                  i tracky, aby se daly procházet skladby.
 * @param resolve   id → entita (pro titulek/URL mezistanic)
 * @param maxDepth  maximální hloubka prohledávání (ochrana proti pomalým
 *                  BFS na velkých grafech). Výchozí 4.
 */
export function computeIndirectPath(
  aId: string,
  bId: string,
  outbound: Record<string, Record<string, string[]>>,
  resolve: (id: string) => CommonGroundEntity | undefined,
  maxDepth = 4,
): IndirectPath | null {
  if (aId === bId) return null;

  // ── Sestav obousměrnou adjacency mapu ──────────────────────────────────
  // `outbound` obsahuje hrany jen jedním směrem (artist→artist přes
  // RELATED_TO, track→artist přes HAS_ARTIST/FEATURES). Aby šlo procházet
  // i artist→track (přes sdílenou skladbu), postavíme inverzní index.
  const fwd = new Map<string, Map<string, string[]>>();
  const inv = new Map<string, Array<{ from: string; label: string }>>();

  for (const [id, rels] of Object.entries(outbound)) {
    let m = fwd.get(id);
    if (!m) { m = new Map(); fwd.set(id, m); }
    for (const [rel, ids] of Object.entries(rels)) {
      const label = INDIRECT_RELATIONS[rel];
      if (!label) continue;
      m.set(rel, ids);
      for (const to of ids) {
        let arr = inv.get(to);
        if (!arr) { arr = []; inv.set(to, arr); }
        arr.push({ from: id, label });
      }
    }
  }

  // Sousedé uzlu = přímé outbound hrany + inverzní (kdo na mě ukazuje).
  // U inverzních hran obracíme popis: „hostoval na" se stává „má hosta".
  const INVERSE_LABEL: Record<string, string> = {
    "spolupracoval s": "spolupracoval s",
    "hostoval na": "hostil",
    "nahrál s": "nahrál s",
  };

  const neighbors = (id: string): Array<{ to: string; label: string; viaId: string }> => {
    const out: Array<{ to: string; label: string; viaId: string }> = [];
    // přímé hrany
    const f = fwd.get(id);
    if (f) {
      for (const [rel, ids] of f.entries()) {
        const label = INDIRECT_RELATIONS[rel];
        for (const to of ids) {
          out.push({ to, label: label ?? "propojen s", viaId: to });
        }
      }
    }
    // inverzní hrany
    const invs = inv.get(id);
    if (invs) {
      for (const { from, label } of invs) {
        const l = INVERSE_LABEL[label] ?? "propojen s";
        out.push({ to: from, label: l, viaId: from });
      }
    }
    return out;
  };

  // Bidirectional BFS.
  type Step = { node: string; prev: Step | null; label: string; viaId: string };

  const queueA: Step[] = [{ node: aId, prev: null, label: "", viaId: "" }];
  const queueB: Step[] = [{ node: bId, prev: null, label: "", viaId: "" }];
  const visitedA = new Map<string, Step>([[aId, queueA[0]]]);
  const visitedB = new Map<string, Step>([[bId, queueB[0]]]);

  const expand = (queue: Step[], visited: Map<string, Step>) => {
    const levelSize = queue.length;
    for (let i = 0; i < levelSize; i++) {
      const cur = queue.shift()!;
      for (const nb of neighbors(cur.node)) {
        if (visited.has(nb.to)) continue;
        const step: Step = { node: nb.to, prev: cur, label: nb.label, viaId: nb.viaId };
        visited.set(nb.to, step);
        queue.push(step);
      }
    }
  };

  for (let depth = 0; depth < maxDepth; depth++) {
    expand(queueA, visitedA);
    expand(queueB, visitedB);

    let meetNode: string | null = null;
    for (const key of visitedA.keys()) {
      if (visitedB.has(key)) { meetNode = key; break; }
    }
    if (meetNode) {
      return reconstructPath(meetNode, visitedA.get(meetNode)!, visitedB.get(meetNode)!, resolve);
    }
  }

  return null;
}


/** Sestaví seřazenou cestu z průsečíku bidirectional BFS. */
interface PathStep {
  node: string;
  prev: PathStep | null;
  label: string;
  viaId: string;
}

function reconstructPath(
  meetNode: string,
  stepA: PathStep,
  stepB: PathStep,
  resolve: (id: string) => CommonGroundEntity | undefined,
): IndirectPath | null {
  // Cesta z A k meetu (bez A samotného), v přirozeném pořadí A→meet.
  const aPath: Array<{ node: string; label: string }> = [];
  let cur: PathStep | null = stepA;
  while (cur && cur.prev) {
    aPath.unshift({ node: cur.node, label: cur.label });
    cur = cur.prev;
  }
  // Cesta z meetu k B (bez meetu), v pořadí meet→B.
  const bPath: Array<{ node: string; label: string }> = [];
  cur = stepB;
  while (cur && cur.prev) {
    bPath.push({ node: cur.node, label: cur.label });
    cur = cur.prev;
  }

  const hops: IndirectHop[] = [];

  const pushHop = (node: string, label: string) => {
    const ent = resolve(node);
    if (!ent) return;
    hops.push({
      viaId: ent.id,
      viaTitle: ent.title,
      viaUrl: urlFor(ent),
      label: label || "propojen s",
      fromId: "",
      toId: node,
    });
  };

  // A → meet (každý node kromě samotného A).
  for (const s of aPath) pushHop(s.node, s.label);
  // meet samotný (mezistanice).
  pushHop(meetNode, "přes");
  // meet → B (každý node kromě meetu).
  for (const s of bPath) pushHop(s.node, s.label);

  if (hops.length === 0) return null;
  return { length: hops.length, hops };
}

/** URL prefix pro entitu (zrcadlí ROUTE_PREFIX). */
function urlFor(entity: CommonGroundEntity): string {
  const prefix = ROUTE_PREFIX[entity.type] ?? `/${entity.type}`;
  return `${prefix}/${entity.slug}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Skóre podobnosti (0–100 %) — vážené z přímých shod.
//
// Doplňuje „společných vazeb: N" o číselné skóre, které zohledňuje, JAK
// silná je shoda (společný žánr váží víc než společná lokalita).
// ═══════════════════════════════════════════════════════════════════════════

/** Váha jednotlivých relací pro skóre podobnosti. */
const SIMILARITY_WEIGHTS: Record<string, number> = {
  HAS_GENRE: 3.0,
  HAS_STYLE: 2.5,
  HAS_MOOD: 2.0,
  HAS_THEME: 1.5,
  RELEASED_BY: 2.0, // společný label
  SIGNED_TO: 2.0,
  BELONGS_TO_SCENE: 2.0,
  ORIGINATES_FROM: 1.0, // společné město
};

export interface SimilarityScore {
  /** 0–100, zaokrouhlené na celé číslo. */
  score: number;
  /** Vážený součet (před normalizací) — pro ladění. */
  weighted: number;
  /** Rozpad podle relace → počet sdílených položek. */
  breakdown: Array<{ relation: string; count: number; weight: number }>;
}

/**
 * Vypočítá skóre podobnosti dvou entit (typicky artistů).
 *
 * Vážený součet sdílených vazeb, normalizovaný na 0–100. Normalizace je
 * relativní k „bohatšímu" umělci (kdo má víc vazeb), aby dvojice, kde oba
 * mají 100 vazeb a sdílí 50, měla vyšší skóre než dvojice, kde jeden má
 * jen 3 a sdílí 2.
 *
 * @param a       entita A (s outbound)
 * @param b       entita B (s outbound)
 */
export function computeSimilarityScore(
  a: CommonGroundEntity,
  b: CommonGroundEntity,
): SimilarityScore {
  let weighted = 0;
  let maxPossible = 0;
  const breakdown: SimilarityScore["breakdown"] = [];

  for (const [relation, weight] of Object.entries(SIMILARITY_WEIGHTS)) {
    const aIds = new Set(a.outbound?.[relation] ?? []);
    const bIds = new Set(b.outbound?.[relation] ?? []);
    const shared = [...aIds].filter((id) => bIds.has(id));
    const count = shared.length;
    if (count === 0) continue;
    weighted += count * weight;
    breakdown.push({ relation, count, weight });
  }

  // Max možný vážený součet = váhy × (velikost menšího z obou setů).
  // Tím je skóre symetrické a normalizované k reálnému překryvu.
  for (const [relation, weight] of Object.entries(SIMILARITY_WEIGHTS)) {
    const aSize = (a.outbound?.[relation] ?? []).length;
    const bSize = (b.outbound?.[relation] ?? []).length;
    maxPossible += Math.min(aSize, bSize) * weight;
  }

  const score = maxPossible > 0 ? Math.round((weighted / maxPossible) * 100) : 0;

  breakdown.sort((x, y) => y.count * y.weight - x.count * x.weight);

  return { score, weighted, breakdown };
}
