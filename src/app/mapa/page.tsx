import { Metadata } from "next";
import { readEntities, readEntityById } from "@/lib/content/cache-reader";
import Link from "next/link";

export const metadata: Metadata = {
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

const COORDS: Record<string, [number, number]> = {
  "location_praha":               [50.0755, 14.4378],
  "location_brno":                [49.1951, 16.6068],
  "location_ostrava":             [49.8209, 18.2625],
  "location_liberec":             [50.7663, 15.0543],
  "location_pardubice":           [50.0343, 15.7812],
  "location_karlovy-vary":        [50.2319, 12.8710],
  "location_usti-nad-labem":      [50.6611, 14.0522],
  "location_kladno":              [50.1473, 14.1025],
  "location_hostivice":           [50.0796, 14.2585],
  "location_tabor":               [49.4144, 14.6579],
  "location_ostrov":              [50.3054, 12.9390],
  "location_rychnov-nad-kneznou": [50.1629, 16.2747],
  "location_dobrichovice":        [49.9273, 14.2720],
};

function getLocationsWithCoords(): MapLocation[] {
  const entities = readEntities();
  if (!entities) return [];

  const results: MapLocation[] = [];

  for (const [id, coords] of Object.entries(COORDS)) {
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
          Rapová <span className="text-[#e4ff1a]">mapa</span>
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
                <span className="text-[10px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
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
