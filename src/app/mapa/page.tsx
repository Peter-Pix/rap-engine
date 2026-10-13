import { Metadata } from "next";
import { readEntities, readEntityById } from "@/lib/content/cache-reader";
import { isSceneCity } from "@/lib/content/scene-locations";
import { CITY_COORDS } from "@/lib/content/city-coords";
import SceneMap from "./SceneMap";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  title: "Mapa české rapové scény",
  description:
    "Interaktivní mapa měst, která tvarují českou a slovenskou rapovou scénu. Kdo odkud pochází — Praha, Brno, Ostrava, Bratislava, Košice a další.",
};

interface MapCity {
  id: string;
  slug: string;
  title: string;
  description: string;
  artistCount: number;
  lon: number;
  lat: number;
}

function getSceneCities(): MapCity[] {
  const entities = readEntities();
  if (!entities) return [];

  const all = Object.values(entities);
  const cities: MapCity[] = [];

  for (const [id, coords] of Object.entries(CITY_COORDS)) {
    if (!isSceneCity(id)) continue;
    const ent = readEntityById(id);
    if (!ent) continue;

    const artistCount = all.filter(
      (e) =>
        e.type === "artist" &&
        (e.outbound?.["ORIGINATES_FROM"]?.includes(id) ||
          e.outbound?.["RELATED_TO"]?.includes(id)),
    ).length;

    cities.push({
      id,
      slug: ent.slug,
      title: ent.title,
      description: ent.description ?? "",
      artistCount,
      lon: coords[0],
      lat: coords[1],
    });
  }

  return cities.sort((a, b) => b.artistCount - a.artistCount);
}

export default function MapPage() {
  const cities = getSceneCities();
  const totalArtists = cities.reduce((s, c) => s + c.artistCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase leading-[0.92] mb-3">
          Rapová <span className="text-[var(--re-accent)]">mapa</span>
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Odkud česká a slovenská rapová scéna pochází. {cities.length} měst,{" "}
          {totalArtists} vazeb mezi interprety a jejich městy. Klikni na bod.
        </p>
      </div>

      <SceneMap cities={cities} />

      {/* Seznam měst s popisky (SEO + čitelnost bez JS) */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-white mb-4">Města podle počtu interpretů</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cities.slice(0, 12).map((loc) => (
            <Link key={loc.id} href={`/lokality/${loc.slug}`} className="block group">
              <div className="glass glass-hover rounded-xl p-5 transition-all duration-200 group-hover:translate-y-[-1px] h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-zinc-100 group-hover:text-white transition-colors">
                    {loc.title}
                  </h3>
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
    </div>
  );
}
