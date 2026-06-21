import Link from "next/link";
import { TYPE_ROUTE_MAP } from "@/lib/content/constants";

// ─── Types ────────────────────────────────────────────────────────────────

export interface AlbumTile {
  id: string;
  slug: string;
  title: string;
  image?: string;
  publishedAt?: string;
  artistTitle?: string;
}

interface TrendingAlbumsProps {
  albums: AlbumTile[];
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * 2 × 3 grid of trending album tiles with cover art, name, artist, year.
 */
export function TrendingAlbums({ albums }: TrendingAlbumsProps) {
  const items = albums.slice(0, 6);

  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">
          Trendující alba
        </h2>
        <Link
          href="/alba"
          className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-[#c8962e] transition-colors"
        >
          Všechna →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-[2px]">
        {items.map((album) => {
          const route = `${TYPE_ROUTE_MAP.album}/${album.slug}`;
          const year = album.publishedAt ? album.publishedAt.slice(0, 4) : null;

          return (
            <Link
              key={album.id}
              href={route}
              className="group relative aspect-square overflow-hidden bg-white/[0.04] block"
            >
              {album.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={album.image}
                  alt={album.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-white/[0.03]">
                  <div className="text-3xl font-black text-white/15">♪</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/25">
                    bez coveru
                  </div>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-12">
                <div className="text-base font-bold text-white leading-tight truncate">
                  {album.title}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-white/50 mt-1 truncate">
                  {album.artistTitle ?? "—"}
                  {year ? ` · ${year}` : ""}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
