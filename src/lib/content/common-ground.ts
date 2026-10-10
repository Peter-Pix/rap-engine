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
 */
export function commonGroundVerdict(result: CommonGroundResult): string {
  const t = result.totalShared;
  if (t === 0) return "Žádná přímá shoda — zkus jinou dvojici.";
  if (t === 1) return "Jedna nit, ale je.";
  if (t <= 3) return "Pár společných bodů.";
  if (t <= 6) return "Solidní překryv.";
  return "Skoro dvojčata.";
}
