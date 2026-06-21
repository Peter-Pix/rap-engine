import Link from "next/link";
import { TYPE_ROUTE_MAP } from "@/lib/content/constants";
import { getArtistImage } from "@/lib/content/images";

// ─── Types ────────────────────────────────────────────────────────────────

export interface ArtistTile {
  id: string;
  slug: string;
  title: string;
  image?: string;
  originTitle?: string;
  labelTitle?: string;
  connectivity: number;
}

interface TrendingArtistsProps {
  artists: ArtistTile[];
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * 2 × 3 grid of trending artist tiles with image, name, and a short
 * contextual caption ("12 alb · Praha · Milion+") derived from relations.
 */
export function TrendingArtists({ artists }: TrendingArtistsProps) {
  const items = artists.slice(0, 6);

  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">
          Trendující interpreti
        </h2>
        <Link
          href="/raperi"
          className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-[#c8962e] transition-colors"
        >
          Všichni →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-[2px]">
        {items.map((artist) => {
          const localImg = getArtistImage(artist.slug);
          const imgUrl = localImg ?? artist.image;
          const route = `${TYPE_ROUTE_MAP.artist}/${artist.slug}`;
          const caption = buildArtistCaption(artist);

          return (
            <Link
              key={artist.id}
              href={route}
              className="group relative aspect-square overflow-hidden bg-white/[0.04] block"
            >
              {imgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl}
                  alt={artist.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white/15">
                  {artist.title[0]}
                </div>
              )}
              {/* Bottom gradient + caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-12">
                <div className="text-base font-bold text-white leading-tight truncate">
                  {artist.title}
                </div>
                {caption && (
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/50 mt-1 truncate">
                    {caption}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildArtistCaption(a: ArtistTile): string {
  const parts: string[] = [];
  if (a.originTitle) parts.push(a.originTitle);
  if (a.labelTitle) parts.push(a.labelTitle);
  if (parts.length === 0) parts.push(`${a.connectivity} vazeb`);
  return parts.join(" · ");
}
