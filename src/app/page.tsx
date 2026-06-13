import Link from "next/link";
import { readEntities } from "@/lib/content/cache-reader";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";
import { EntityCard } from "@/components/entity/EntityCard";
import { ENTITY_TYPE_LABELS } from "@/lib/search";
import { getArtistImage } from "@/lib/content/images";

export default function HomePage() {
  const entities = readEntities();
  const all = entities ? Object.values(entities) : [];

  // Group by type
  const byType = new Map<string, typeof all>();
  for (const e of all) {
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }

  // Pick a few random artists and genres for "daily" sections
  const artists = byType.get("artist") ?? [];
  const genres = byType.get("genre") ?? [];

  const dailyArtists = shuffleSlice(artists, 3);
  const dailyGenres = shuffleSlice(genres, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Hero placeholder */}
      <section className="mb-12">
        <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900/60 to-zinc-950/60 ring-1 ring-white/10 p-8 sm:p-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white uppercase leading-[0.92] mb-4">
            4rap<span className="text-[#e4ff1a]">.cz</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed mb-2">
            Znalostní graf české a slovenské rapové scény — interpreti, alba,
            žánry, labely, lokality. Všechno propojené.
          </p>
          <p className="text-sm text-zinc-600">
            {all.length} entit napříč {byType.size} typy
          </p>
        </div>
      </section>

      {/* Daily rappers */}
      {dailyArtists.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <span aria-hidden>🎤</span>
              RAPPEŘI DNE
            </h2>
            <Link
              href="/raperi"
              className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Všichni rappeři →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dailyArtists.map((e) => (
              <EntityCard
                key={e.id}
                type="artist"
                title={e.title}
                description={e.description}
                href={`/raperi/${e.slug}`}
                image={getArtistImage(e.slug)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Daily genres */}
      {dailyGenres.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <span aria-hidden>🏷️</span>
              ŽÁNRY DNE
            </h2>
            <Link
              href="/zanry"
              className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Všechny žánry →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dailyGenres.map((e) => (
              <EntityCard
                key={e.id}
                type="genre"
                title={e.title}
                description={e.description}
                href={`/zanry/${e.slug}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* All entity types grid */}
      {all.length > 0 && (
        <section>
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
            Všechny kategorie
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(
              [
                "artist",
                "album",
                "genre",
                "style",
                "mood",
                "theme",
                "scene",
                "label",
                "location",
                "article",
                "collective",
                "producer",
              ] as EntityType[]
            ).map((type) => {
              const items = byType.get(type);
              const count = items?.length ?? 0;
              const prefix = TYPE_ROUTE_MAP[type] ?? `/${type}`;
              const label =
                ENTITY_TYPE_LABELS[type] ?? type;
              return (
                <Link
                  key={type}
                  href={prefix}
                  className="glass glass-hover rounded-xl p-4 transition-all duration-200 hover:translate-y-[-1px] text-center"
                >
                  <div className="text-2xl font-black text-white">
                    {count}
                  </div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mt-1">
                    {label}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/** Deterministic-ish shuffle using date as seed. Returns first `n` items. */
function shuffleSlice<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return [];
  // Simple day-based seed — changes daily
  const seed = Math.floor(Date.now() / 86400000);
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed + i * 31) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}
