import Link from "next/link";
import { readEntities, readGraph } from "@/lib/content/cache-reader";
import { getArtistImage } from "@/lib/content/images";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

// ─── Types ────────────────────────────────────────────────────────────────

interface FlatEntity {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string;
  profile?: Record<string, unknown>;
  outbound?: Record<string, string[]>;
}

// ─── Rankings ─────────────────────────────────────────────────────────────

/** Builds a map of entity ID → total edges (both directions) */
function computeEdgeCounts(
  graph: Array<{ from: string; to: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of graph) {
    counts[e.from] = (counts[e.from] ?? 0) + 1;
    counts[e.to] = (counts[e.to] ?? 0) + 1;
  }
  return counts;
}

/** Build an index of all entities by ID for quick lookup */
function buildEntityIndex(
  entities: Record<string, FlatEntity>,
): Record<string, FlatEntity> {
  return entities;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Resolve entity ID to a route */
function entityRoute(type: string, slug: string): string {
  return `${TYPE_ROUTE_MAP[type as EntityType] ?? `/${type}`}/${slug}`;
}

/** Build a readable "Kdo s kým" description for an artist */
function buildSceneDescription(
  entity: FlatEntity,
  index: Record<string, FlatEntity>,
): string[] {
  const lines: string[] = [];
  const out = entity.outbound ?? {};

  // Groups / collectives
  const groups = (out.MEMBER_OF ?? []).map((id) => index[id]).filter(Boolean);
  if (groups.length > 0) {
    const names = groups.map((g) => g.title);
    lines.push(
      `Člen ${names.length > 1 ? "skupin" : "skupiny"} ${names.join(", ")}.`,
    );
  }

  // Label
  const labels = (out.SIGNED_TO ?? [])
    .map((id) => index[id])
    .filter(Boolean);
  if (labels.length > 0) {
    lines.push(`Label: ${labels.map((l) => l.title).join(", ")}.`);
  }

  // Related artists
  const related = (out.RELATED_TO ?? [])
    .map((id) => index[id])
    .filter(Boolean);
  if (related.length > 0) {
    const names = related.slice(0, 4).map((r) => r.title);
    if (related.length > 4) names.push(`a ${related.length - 4} dalšími`);
    lines.push(`Tracky s ${names.join(", ")}.`);
  }

  // Origin / location
  const origins = (out.ORIGINATES_FROM ?? [])
    .map((id) => index[id])
    .filter(Boolean);
  if (origins.length > 0) {
    lines.push(`Místo: ${origins.map((o) => o.title).join(", ")}.`);
  }

  return lines;
}

// ─── Homepage ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const entities = readEntities();
  const graph = readGraph();
  if (!entities) return null;

  const index = buildEntityIndex(entities as unknown as Record<string, FlatEntity>);
  const all = Object.values(entities) as FlatEntity[];
  const edgeCounts = graph ? computeEdgeCounts(graph) : {};

  // Artists ranked by graph connectivity
  const artists = all.filter((e) => e.type === "artist");
  const ranked = artists
    .map((a) => ({
      ...a,
      connectivity: edgeCounts[a.id] ?? 0,
    }))
    .sort((a, b) => b.connectivity - a.connectivity);

  const top5Ranked = ranked.slice(0, 5);
  const sceneCards = ranked
    .filter((a) => a.profile && a.connectivity > 0)
    .slice(0, 3);

  // Key tracks: first key track from each top-ranked artist with profile
  const keyTracks: Array<{ artist: string; track: string; slug: string }> = [];
  for (const a of ranked) {
    const p = a.profile;
    if (!p?.keyTracks || !Array.isArray(p.keyTracks) || p.keyTracks.length === 0)
      continue;
    keyTracks.push({
      artist: a.title,
      track: p.keyTracks[0] as string,
      slug: a.slug,
    });
    if (keyTracks.length >= 6) break;
  }

  // Featured entities (mix of types with images)
  const featured: Array<FlatEntity> = [];
  const typePriority: EntityType[] = ["artist", "label", "location", "collective"];
  for (const tpe of typePriority) {
    const candidates = all.filter(
      (e) => e.type === tpe && getArtistImage(e.slug),
    );
    // For artists, prefer ones with profile data
    const sorted = candidates.sort(
      (a, b) => (edgeCounts[b.id] ?? 0) - (edgeCounts[a.id] ?? 0),
    );
    if (sorted.length > 0) featured.push(sorted[0]);
    if (featured.length >= 4) break;
  }
  // Fallback: fill with artist images
  while (featured.length < 4 && ranked.length > featured.length) {
    const next = ranked[featured.length];
    if (!featured.find((f) => f.id === next.id) && getArtistImage(next.slug)) {
      featured.push(next);
    } else {
      break;
    }
  }

  return (
    <main className="max-w-[1100px] mx-auto px-4 sm:px-8">

      {/* ═══════════════════════════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════════════════════════ */}
      <section className="pt-[140px] pb-12 border-b border-white/[0.06] mb-16">
        <h1 className="text-[clamp(44px,9vw,80px)] font-black tracking-tighter text-white uppercase leading-[0.85] mb-6">
          rap<span className="text-[#c8962e]">guru</span>
        </h1>
        <p className="text-base text-white/60 max-w-[560px] leading-relaxed">
          Sledujeme {artists.length} interpretů, {all.filter((e) => e.type === "album").length} alb
          a tisíce propojení mezi nimi — kdo s kým dělá, kdo je odkud, kdo hraje stejnou ligu.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
         KDO S KÝM  (3 scene cards)
         ═══════════════════════════════════════════════════════════════ */}
      {sceneCards.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">Kdo s kým</h2>
            <Link href="/scena" className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-[#c8962e] transition-colors">
              Celá síť →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[2px]">
            {sceneCards.map((artist) => {
              const lines = buildSceneDescription(artist, index);
              return (
                <a
                  key={artist.id}
                  href={entityRoute("artist", artist.slug)}
                  className="block bg-white/[0.03] p-7 sm:p-6 transition-colors hover:bg-white/[0.06]"
                >
                  <div className="text-lg font-bold text-white mb-3">
                    {artist.title}
                  </div>
                  <div className="text-sm text-white/50 leading-relaxed space-y-1.5">
                    {lines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         NEJVÍC NAPOJENÍ
         ═══════════════════════════════════════════════════════════════ */}
      {top5Ranked.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">Nejvíc napojení interpreti</h2>
            <Link href="/raperi" className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-[#c8962e] transition-colors">
              Všichni →
            </Link>
          </div>
          <div>
            {top5Ranked.map((a, i) => (
              <a
                key={a.id}
                href={entityRoute("artist", a.slug)}
                className="grid grid-cols-[28px_1fr_auto] gap-4 items-center py-2.5 border-b border-white/[0.06] last:border-none transition-opacity hover:opacity-60"
              >
                <span className="text-xs font-mono text-white/30 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-white/90 font-medium">
                  {a.title}
                </span>
                <span className="text-xs text-white/50">
                  {a.connectivity} spojení
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         KLÍČOVÝ TRACKY
         ═══════════════════════════════════════════════════════════════ */}
      {keyTracks.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">Klíčový tracky</h2>
            <Link href="/tracky" className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-[#c8962e] transition-colors">
              Všechny →
            </Link>
          </div>
          <div className="max-w-[640px]">
            {keyTracks.map((t) => (
              <a
                key={`${t.slug}-${t.track}`}
                href={entityRoute("artist", t.slug)}
                className="grid grid-cols-[140px_1fr] gap-3 py-1.5 transition-opacity hover:opacity-60 sm:grid-cols-[140px_1fr]"
              >
                <span className="text-sm text-white/50">{t.artist}</span>
                <span className="text-sm text-white/80">{t.track}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         VÝBĚR  (featured grid)
         ═══════════════════════════════════════════════════════════════ */}
      {featured.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">Výběr</h2>
            <Link href="/raperi" className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-[#c8962e] transition-colors">
              Všechny profily →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[2px]">
            {featured.map((e) => {
              const img = getArtistImage(e.slug);
              const label = {
                artist: "Interpret",
                label: "Label",
                location: "Místo",
                collective: "Skupina",
                album: "Album",
              }[e.type] ?? e.type;

              return (
                <a
                  key={e.id}
                  href={entityRoute(e.type, e.slug)}
                  className="relative aspect-[3/4] overflow-hidden bg-white/[0.03] flex items-end"
                >
                  {img && (
                    <img
                      src={img}
                      alt={e.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.75)] to-transparent" />
                  <div className="relative z-10 p-4 w-full">
                    <span className="block text-[9px] font-mono uppercase tracking-wider text-[#c8962e] mb-1">
                      {label}
                    </span>
                    <span className="block text-base font-semibold text-white">
                      {e.title}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         NADCHÁZEJÍCÍ AKCE (placeholder)
         ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-16">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35 mb-5">Nadcházející akce</h2>
        <div className="py-8 border-t border-white/[0.06]">
          <p className="text-sm text-white/40">
            Brzy doplníme — kalendář koncertů a eventů.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════════════════════════════ */}
      <footer className="py-12 border-t border-white/[0.06] text-xs text-white/40">
        rap<span className="text-[#c8962e]">guru</span> — mapa českýho a
        slovenskýho rapu
      </footer>
    </main>
  );
}