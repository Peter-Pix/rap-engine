"use client";

import { trackSimilarArtistClick } from "@/lib/analytics";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

interface SimilarArtist {
  id: string;
  type: string;
  slug: string;
  title: string;
  score: number;
}

interface SimilarArtistsProps {
  artists: SimilarArtist[];
  fromArtist: string;
}

export function SimilarArtistsSection({ artists, fromArtist }: SimilarArtistsProps) {
  if (artists.length === 0) return null;

  return (
    <section className="mb-10 pb-10 border-b border-white/[0.06]">
      <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
        Podobní interpreti
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {artists.map((s) => {
          const route = `${TYPE_ROUTE_MAP[s.type as EntityType] ?? `/${s.type}`}/${s.slug}`;
          return (
            <a
              key={s.id}
              href={route}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-[#e4ff1a]/[0.3] rounded-lg text-sm transition-all"
              onClick={() => trackSimilarArtistClick(fromArtist, s.title, s.score)}
            >
              <span className="font-medium text-white">{s.title}</span>
              <span className="text-[10px] font-mono text-white/50">
                {Math.round(s.score * 100)}%
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
