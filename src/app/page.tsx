import Link from "next/link";
import { readEntities, readGraph } from "@/lib/content/cache-reader";
import { getArtistImage } from "@/lib/content/images";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

const RAP44_API = "https://44rap.base44.app/api";
const RAP44_KEY = "b9d03638f3df4fe49ee5e75ab26d0803";

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

  const top20Ranked = ranked.slice(0, 20);
  const sceneCards = ranked
    .filter((a) => a.profile && a.connectivity > 0)
    .slice(0, 3);

  return (
    <main className="max-w-[1100px] mx-auto px-4 sm:px-8">

      {/* ═══════════════════════════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════════════════════════ */}
      <section className="pt-[140px] pb-12 border-b border-white/[0.06] mb-16">
        <h1 className="text-[clamp(44px,9vw,80px)] font-black tracking-tighter text-white uppercase leading-[0.85] mb-6">
          4rap<span className="text-[#c8962e]">.</span>
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
         NEJVÍC NAPOJENÍ  (TOP 20)
         ═══════════════════════════════════════════════════════════════ */}
      {top20Ranked.length > 0 && (
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">Top 20 nejvíc napojených interpretů</h2>
            <Link href="/raperi" className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-[#c8962e] transition-colors">
              Všichni →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {top20Ranked.map((a, i) => {
              const img = getArtistImage(a.slug);
              return (
                <a
                  key={a.id}
                  href={entityRoute("artist", a.slug)}
                  className="group grid grid-cols-[28px_40px_1fr_auto] gap-3 items-center py-2 border-b border-white/[0.06] last:border-none transition-colors hover:bg-white/[0.04]"
                >
                  <span className={`text-xs font-mono text-right ${i < 3 ? "text-[#c8962e] font-bold" : "text-white/30"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-white/[0.06] flex-shrink-0">
                    {img ? (
                      <img src={img} alt={a.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/30">
                        {a.title[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-white/90 font-medium truncate">
                    {a.title}
                  </span>
                  <span className="text-xs text-white/40 tabular-nums">
                    {a.connectivity}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         NADCHÁZEJÍCÍ AKCE (44rap)
         ═══════════════════════════════════════════════════════════════ */}
      <UpcomingEventsSection />

      {/* ═══════════════════════════════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════════════════════════════ */}
      <footer className="py-12 border-t border-white/[0.06] text-xs text-white/40">
        4rap<span className="text-[#c8962e]">.</span> — mapa českýho a
        slovenskýho rapu
      </footer>
    </main>
  );
}

// ─── Upcoming Events (server component, 44rap) ─────────────────────────────

interface RapEvent {
  id: string;
  title: string;
  venue: string;
  city: string;
  country: string;
  event_date: string;
  event_type: string;
  headliners: string[];
  lineup: string[];
  ticket_url: string;
  rap_relevance_score: number;
  active?: boolean;
}

async function fetchUpcomingEvents(): Promise<RapEvent[]> {
  try {
    const res = await fetch(`${RAP44_API}/entities/RapEvent?limit=20`, {
      headers: { api_key: RAP44_KEY },
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!res.ok) return [];
    const events: RapEvent[] = await res.json();
    const now = new Date();
    return events
      .filter((e) => e.active !== false && new Date(e.event_date) >= now)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 8);
  } catch {
    return [];
  }
}

async function UpcomingEventsSection() {
  const events = await fetchUpcomingEvents();

  if (events.length === 0) {
    return (
      <section className="mb-16">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35 mb-5">Nadcházející akce</h2>
        <div className="py-8 border-t border-white/[0.06]">
          <p className="text-sm text-white/40">Žádné nadcházející akce.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">Nadcházející akce</h2>
        <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40">zdroj: 44rap</span>
      </div>
      <div className="space-y-[2px]">
        {events.map((e) => {
          const date = new Date(e.event_date);
          const day = date.getDate();
          const month = date.toLocaleString("cs", { month: "short" });
          const eventTypeColor = {
            concert: "bg-[#c8962e]",
            festival: "bg-purple-500",
            battle: "bg-red-500",
          }[e.event_type] ?? "bg-white/30";

          return (
            <a
              key={e.id}
              href={e.ticket_url || "#"}
              target={e.ticket_url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="group grid grid-cols-[60px_1fr_auto] sm:grid-cols-[80px_1fr_auto] gap-3 sm:gap-4 items-center py-3 px-3 -mx-3 border-b border-white/[0.06] last:border-none transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex flex-col items-center justify-center w-12 sm:w-16 py-1.5 bg-white/[0.04] group-hover:bg-[#c8962e]/10 transition-colors">
                <span className="text-lg font-bold text-white leading-none">{day}</span>
                <span className="text-[9px] font-mono uppercase text-white/50 tracking-wider">{month}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${eventTypeColor}`} />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">{e.event_type}</span>
                  {e.rap_relevance_score && (
                    <span className="text-[10px] font-mono text-[#c8962e]">★ {e.rap_relevance_score.toFixed(0)}</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{e.title}</h3>
                <p className="text-xs text-white/50 truncate">
                  {e.venue}, {e.city} {e.country && `(${e.country})`}
                  {e.headliners?.length ? ` · ${e.headliners.join(", ")}` : ""}
                </p>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 group-hover:text-[#c8962e] transition-colors">
                {e.ticket_url ? "Vstupenky →" : ""}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}