import { Metadata } from "next";
import { readEntities, readEntityById } from "@/lib/content/cache-reader";
import Link from "next/link";
import { isSceneCity } from "@/lib/content/scene-locations";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  title: "Mapa české rapové scény",
  description: "Přehled míst, která tvarují českou a slovenskou rapovou scénu.",
};

interface MapLocation {
  id: string;
  slug: string;
  title: string;
  description: string;
  artistCount: number;
}

/**
 * Souřadnice měst CZ/SK rapové scény.
 *
 * Země (Česko, Slovensko) a zahraniční města (Londýn, Manchester, Francie)
 * jsou záměrně VYNECHÁNY — mapa zobrazuje města, odkud interpreti pocházejí,
 * ne státy ani zahraniční působiště.
 *
 * Zdroj: geografické souřadnice měst (WGS84).
 */
const COORDS: Record<string, [number, number]> = {
  // ── Česko ──
  "location_praha":               [50.0755, 14.4378],
  "location_brno":                [49.1951, 16.6068],
  "location_ostrava":             [49.8209, 18.2625],
  "location_plzen":               [49.7384, 13.3736],
  "location_liberec":             [50.7663, 15.0543],
  "location_olomouc":             [49.5938, 17.2509],
  "location_ceske-budejovice":    [48.9745, 14.4743],
  "location_hradec-kralove":      [50.2104, 15.8252],
  "location_pardubice":           [50.0343, 15.7812],
  "location_zlin":                [49.2263, 17.6666],
  "location_usti-nad-labem":      [50.6611, 14.0522],
  "location_karlovy-vary":        [50.2319, 12.8710],
  "location_jihlava":             [49.3961, 15.5912],
  "location_cheb":                [50.0793, 12.3739],
  "location_teplice":             [50.6404, 13.8248],
  "location_kladno":              [50.1473, 14.1025],
  "location_kolin":               [50.0281, 15.2003],
  "location_tabor":               [49.4144, 14.6579],
  "location_ostrov":              [50.3054, 12.9390],
  "location_hostivice":           [50.0796, 14.2585],
  "location_rychnov-nad-kneznou": [50.1629, 16.2747],
  "location_chomutov":            [50.4605, 13.4177],
  "location_slany":               [50.2306, 14.0867],
  "location_starovice":           [48.9481, 16.7258],
  "location_kromeriz":            [49.2980, 17.3930],
  // ── Slovensko ──
  "location_bratislava":         [48.1486, 17.1077],
  "location_kosice":              [48.7164, 21.2611],
  "location_nitra":               [48.3069, 18.0864],
  "location_presov":              [48.9975, 21.2393],
  "location_trnava":              [48.3774, 17.5872],
  "location_piestany":            [48.5918, 17.8265],
  "location_ruzomberok":          [49.0748, 19.3078],
  "location_lucenec":             [48.3317, 19.6660],
  "location_handlova":            [48.7277, 18.7596],
  "location_namestovo":           [49.4067, 19.4809],
  "location_nove-mesto-nad-vahom":[48.7559, 17.8320],
  "location_zlate-moravce":       [48.3832, 18.3997],
};

function getLocationsWithCoords(): MapLocation[] {
  const entities = readEntities();
  if (!entities) return [];

  const results: MapLocation[] = [];

  for (const [id, coords] of Object.entries(COORDS)) {
    if (!isSceneCity(id)) continue;
    const ent = readEntityById(id);
    if (!ent) continue;

    const all = Object.values(entities);
    const artistCount = all.filter(
      (e) => e.type === "artist" && (e.outbound?.["ORIGINATES_FROM"]?.includes(id) || e.outbound?.["RELATED_TO"]?.includes(id))
    ).length;

    results.push({
      id,
      slug: ent.slug,
      title: ent.title,
      description: ent.description ?? "",
      artistCount,
    });
  }

  return results.sort((a, b) => b.artistCount - a.artistCount);
}

export default function MapPage() {
  const locations = getLocationsWithCoords();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase leading-[0.92] mb-3">
          Rapová <span className="text-[var(--re-accent)]">mapa</span>
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Přehled míst, která tvarují českou a slovenskou rapovou scénu.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <Link
            key={loc.id}
            href={`/lokality/${loc.slug}`}
            className="block group"
          >
            <div className="glass glass-hover rounded-xl p-5 transition-all duration-200 group-hover:translate-y-[-1px] h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-zinc-100 group-hover:text-white transition-colors">
                  {loc.title}
                </h2>
                <span className="text-[11px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {loc.artistCount}×
                </span>
              </div>
              <p className="text-sm text-zinc-500 line-clamp-2 flex-1">
                {loc.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
