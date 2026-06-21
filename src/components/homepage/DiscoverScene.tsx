import Link from "next/link";
import { TYPE_ROUTE_MAP } from "@/lib/content/constants";

// ─── Types ────────────────────────────────────────────────────────────────

export interface CityTile {
  id: string;
  slug: string;
  title: string;
  artistCount: number;
}

export interface LabelTile {
  id: string;
  slug: string;
  title: string;
  artistCount: number;
}

interface DiscoverSceneProps {
  cities: CityTile[];
  labels: LabelTile[];
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Two-row exploration block: cities + labels. Each tile shows entity
 * name and a count of associated artists.
 */
export function DiscoverScene({ cities, labels }: DiscoverSceneProps) {
  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">
          Objev scénu
        </h2>
      </div>

      {/* Cities */}
      <div className="mb-6">
        <h3 className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/25 mb-2">
          Města
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[2px]">
          {cities.slice(0, 8).map((city) => (
            <Link
              key={city.id}
              href={`${TYPE_ROUTE_MAP.location}/${city.slug}`}
              className="block bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-4"
            >
              <div className="text-base font-bold text-white leading-tight truncate">
                {city.title}
              </div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/40 mt-1">
                {city.artistCount} {city.artistCount === 1 ? "interpret" : city.artistCount < 5 ? "interpreti" : "interpretů"}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div>
        <h3 className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/25 mb-2">
          Labely
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[2px]">
          {labels.slice(0, 8).map((label) => (
            <Link
              key={label.id}
              href={`${TYPE_ROUTE_MAP.label}/${label.slug}`}
              className="block bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-4"
            >
              <div className="text-base font-bold text-white leading-tight truncate">
                {label.title}
              </div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/40 mt-1">
                {label.artistCount} {label.artistCount === 1 ? "interpret" : label.artistCount < 5 ? "interpreti" : "interpretů"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
