import Link from "next/link";
import { readEntities, readGraph, readGraphLayout } from "@/lib/content/cache-reader";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";
import { SearchBar } from "@/components/search/SearchBar";
import { NetworkGraph } from "@/components/homepage/NetworkGraph";
import { TrendingArtists, type ArtistTile } from "@/components/homepage/TrendingArtists";
import { TrendingAlbums, type AlbumTile } from "@/components/homepage/TrendingAlbums";
import { DiscoverScene, type CityTile, type LabelTile } from "@/components/homepage/DiscoverScene";
import { RecentFeed, type FeedItem } from "@/components/homepage/RecentFeed";
import { DatabaseStats } from "@/components/homepage/DatabaseStats";
import { JsonLd } from "@/components/seo/JsonLd";

const RAP44_API = "https://44rap.base44.app/api";
const RAP44_KEY = process.env.RAP_MONITOR_API_KEY || "";
const BASE_URL = "https://4rap.cz";

// ─── Types ────────────────────────────────────────────────────────────────

interface FlatEntity {
  id: string;
  type: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  publishedAt?: string;
  profile?: Record<string, unknown>;
  outbound?: Record<string, string[]>;
}

interface Edge {
  from: string;
  relation: string;
  to: string;
}

// ─── Aggregations ─────────────────────────────────────────────────────────

function computeEdgeCounts(graph: Edge[] | null): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!graph) return counts;
  for (const e of graph) {
    counts[e.from] = (counts[e.from] ?? 0) + 1;
    counts[e.to] = (counts[e.to] ?? 0) + 1;
  }
  return counts;
}

function titleById(
  entities: Record<string, FlatEntity>,
): (id: string) => string | undefined {
  return (id: string) => entities[id]?.title;
}

function buildTrendingArtists(
  entities: Record<string, FlatEntity>,
  graph: Edge[] | null,
): ArtistTile[] {
  const counts = computeEdgeCounts(graph);
  const artists = Object.values(entities).filter((e) => e.type === "artist");
  const t = titleById(entities);

  return artists
    .map((a) => {
      const out = a.outbound ?? {};
      const originId = out.ORIGINATES_FROM?.[0];
      const labelId = out.SIGNED_TO?.[0];

      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        image: a.image,
        originTitle: originId ? t(originId) : undefined,
        labelTitle: labelId ? t(labelId) : undefined,
        connectivity: counts[a.id] ?? 0,
      };
    })
    .filter((a) => a.connectivity > 0)
    .sort((a, b) => b.connectivity - a.connectivity);
}

function buildTrendingAlbums(
  entities: Record<string, FlatEntity>,
  graph: Edge[] | null,
): AlbumTile[] {
  const t = titleById(entities);
  const albums = Object.values(entities).filter((e) => e.type === "album");

  return albums
    .filter((a) => Boolean(a.image) && Boolean(a.publishedAt))
    .map((a) => {
      const out = a.outbound ?? {};
      // Try to resolve primary artist via cached HAS_ALBUM edge (artist → album).
      // Fallback to first RELATED_ARTIST from album.outbound.
      const artistEdge = (graph ?? []).find(
        (e) => e.relation === "HAS_ALBUM" && e.to === a.id,
      );
      const artistId = artistEdge?.from ?? out.RELATED_ARTIST?.[0];
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        image: a.image,
        publishedAt: a.publishedAt,
        artistTitle: artistId ? t(artistId) : undefined,
      };
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

function buildCitiesAndLabels(
  entities: Record<string, FlatEntity>,
  graph: Edge[] | null,
): { cities: CityTile[]; labels: LabelTile[] } {
  if (!graph) return { cities: [], labels: [] };

  const artistByLocation: Record<string, number> = {};
  const artistByLabel: Record<string, number> = {};

  for (const e of graph) {
    if (e.relation === "ORIGINATES_FROM") {
      artistByLocation[e.to] = (artistByLocation[e.to] ?? 0) + 1;
    }
    if (e.relation === "SIGNED_TO") {
      // Only count artist→label edges, not album→label
      const fromEntity = entities[e.from];
      if (fromEntity && fromEntity.type === "artist") {
        artistByLabel[e.to] = (artistByLabel[e.to] ?? 0) + 1;
      }
    }
  }

  const cities: CityTile[] = Object.entries(artistByLocation)
    .map(([id, artistCount]) => {
      const e = entities[id];
      if (!e) return null;
      // Filter out country entities (Česko / Slovensko) — those are not cities.
      if (e.slug === "cesko" || e.slug === "slovensko") return null;
      return { id, slug: e.slug, title: e.title, artistCount };
    })
    .filter((c): c is CityTile => c !== null)
    .sort((a, b) => b.artistCount - a.artistCount);

  const labels: LabelTile[] = Object.entries(artistByLabel)
    .map(([id, artistCount]) => {
      const e = entities[id];
      if (!e) return null;
      return { id, slug: e.slug, title: e.title, artistCount };
    })
    .filter((l): l is LabelTile => l !== null)
    .sort((a, b) => b.artistCount - a.artistCount);

  return { cities, labels };
}

function buildRecentFeed(entities: Record<string, FlatEntity>): FeedItem[] {
  const t = titleById(entities);
  const items: FeedItem[] = [];

  for (const e of Object.values(entities)) {
    if (e.type !== "artist" && e.type !== "album") continue;
    if (!e.publishedAt) continue;

    // For albums: try to resolve artist
    let subtitle: string | undefined;
    if (e.type === "album") {
      const out = e.outbound ?? {};
      const artistId = out.HAS_ARTIST?.[0];
      if (artistId) subtitle = t(artistId);
    }

    items.push({
      id: e.id,
      type: e.type as EntityType,
      slug: e.slug,
      title: e.title,
      publishedAt: e.publishedAt,
      subtitle,
    });
  }

  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function buildCounts(
  entities: Record<string, FlatEntity>,
  graph: Edge[] | null,
): {
  artists: number;
  albums: number;
  tracks: number;
  locations: number;
  labels: number;
  genres: number;
  edges: number;
  entities: number;
} {
  let artists = 0, albums = 0, tracks = 0, locations = 0, labels = 0, genres = 0;
  for (const e of Object.values(entities)) {
    switch (e.type) {
      case "artist": artists++; break;
      case "album": albums++; break;
      case "track": tracks++; break;
      case "location": locations++; break;
      case "label": labels++; break;
      case "genre": genres++; break;
    }
  }
  return {
    artists, albums, tracks, locations, labels, genres,
    edges: graph?.length ?? 0,
    entities: Object.keys(entities).length,
  };
}

/**
 * Schema.org JSON-LD for the homepage.
 *
 * Three top-level items as a @graph array:
 *   1. WebSite — marks this as the canonical homepage, with SearchAction for /hledat
 *   2. ItemList (Top Artists) — ordered list of trending artists as ListItem
 *   3. ItemList (Top Albums) — ordered list of trending albums as ListItem
 *
 * Communicates to Google: "this is a database, not a blog",
 * and gives structured navigation entry points for rich results.
 */
function buildHomeJsonLd(
  artists: ArtistTile[],
  albums: AlbumTile[],
  counts: ReturnType<typeof buildCounts>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      // ── 1. WebSite ─────────────────────────────────────────────
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: "4rap.cz — Největší databáze českého rapu",
        alternateName: "Mapa českého a slovenského rapu",
        description:
          "Databáze a knowledge graph české a slovenské rapové scény. " +
          `${counts.artists} interpretů, ${counts.albums} alb, ${counts.edges} propojení.`,
        inLanguage: "cs",
        publisher: {
          "@type": "Organization",
          "@id": `${BASE_URL}/#org`,
          name: "4rap.cz",
          url: BASE_URL,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/hledat?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },

      // ── 2. ItemList: Top Artists ───────────────────────────────
      {
        "@type": "ItemList",
        "@id": `${BASE_URL}/#top-artists`,
        name: "Nejpropojenější interpreti českého a slovenského rapu",
        description:
          `Top ${artists.length} interpretů podle počtu vazeb v databázi.`,
        numberOfItems: artists.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: artists.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "MusicGroup",
            "@id": `${BASE_URL}${TYPE_ROUTE_MAP.artist}/${a.slug}`,
            name: a.title,
            url: `${BASE_URL}${TYPE_ROUTE_MAP.artist}/${a.slug}`,
          },
        })),
      },

      // ── 3. ItemList: Top Albums ────────────────────────────────
      {
        "@type": "ItemList",
        "@id": `${BASE_URL}/#top-albums`,
        name: "Nejnovější alba českého a slovenského rapu",
        description: `Top ${albums.length} alb podle data vydání.`,
        numberOfItems: albums.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: albums.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "MusicAlbum",
            "@id": `${BASE_URL}${TYPE_ROUTE_MAP.album}/${a.slug}`,
            name: a.title,
            url: `${BASE_URL}${TYPE_ROUTE_MAP.album}/${a.slug}`,
            ...(a.artistTitle ? { byArtist: { "@type": "MusicGroup", name: a.artistTitle } } : {}),
            ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
          },
        })),
      },

      // ── 4. Dataset (knowledge graph framing) ────────────────────
      {
        "@type": "Dataset",
        "@id": `${BASE_URL}/#dataset`,
        name: "4rap.cz — Databáze české a slovenské rapové scény",
        description:
          `Strukturovaná databáze ${counts.artists} interpretů, ${counts.albums} alb, ` +
          `${counts.locations} měst a ${counts.labels} labelů s ${counts.edges} explicitními vazbami.`,
        keywords: [
          "český rap",
          "slovenský rap",
          "hip hop",
          "drill",
          "trap",
          "databáze",
          "knowledge graph",
        ],
        creator: { "@id": `${BASE_URL}/#org` },
        inLanguage: "cs",
        spatialCoverage: [
          { "@type": "Country", name: "Czechia" },
          { "@type": "Country", name: "Slovakia" },
        ],
        measurementTechnique: "Manual curation with AI-assisted metadata enrichment",
      },
    ],
  };
}

// ─── Homepage ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const entities = readEntities();
  const graph = readGraph();
  const layout = readGraphLayout();
  if (!entities) return null;

  const trendingArtists = buildTrendingArtists(
    entities as unknown as Record<string, FlatEntity>,
    graph,
  ).slice(0, 6);

  const trendingAlbums = buildTrendingAlbums(
    entities as unknown as Record<string, FlatEntity>,
    graph,
  ).slice(0, 6);

  const { cities, labels } = buildCitiesAndLabels(
    entities as unknown as Record<string, FlatEntity>,
    graph,
  );

  const recentFeed = buildRecentFeed(
    entities as unknown as Record<string, FlatEntity>,
  ).slice(0, 8);

  const counts = buildCounts(
    entities as unknown as Record<string, FlatEntity>,
    graph,
  );

  const jsonLd = buildHomeJsonLd(trendingArtists, trendingAlbums, counts);

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="max-w-[1100px] mx-auto px-4 sm:px-8">

      {/* ═══════════════════════════════════════════════════════════════
         HERO — databáze, ne magazín
         ═══════════════════════════════════════════════════════════════ */}
      <section className="pt-[140px] pb-12 border-b border-white/[0.06] mb-16">
        {/* Brand logo — není H1, vizuální identita */}
        <div className="text-[clamp(44px,9vw,80px)] font-black tracking-tighter text-white uppercase leading-[0.85] mb-2">
          4rap<span className="text-[#c8962e]">.</span>
        </div>

        {/* H1 — silný headline pro SEO, obsahuje klíčová slova */}
        <h1 className="text-2xl sm:text-3xl lg:text-[clamp(32px,5vw,48px)] font-black tracking-tight text-white leading-[0.95] max-w-[800px] mb-3">
          Největší databáze českého rapu, rapperů a alb
        </h1>

        <p className="text-base text-white/60 max-w-[600px] leading-relaxed mb-8">
          Prozkoumej interprety, alba, labely, města a jejich vzájemné vazby.
        </p>

        {/* Search */}
        <div className="max-w-md mb-8">
          <SearchBar />
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <Link href="/raperi" className="text-sm font-bold text-white hover:text-[#c8962e] transition-colors">
            {counts.artists} <span className="text-white/50 font-normal">interpretů</span>
          </Link>
          <span className="text-white/20">·</span>
          <Link href="/alba" className="text-sm font-bold text-white hover:text-[#c8962e] transition-colors">
            {counts.albums} <span className="text-white/50 font-normal">alb</span>
          </Link>
          <span className="text-white/20">·</span>
          <Link href="/lokality" className="text-sm font-bold text-white hover:text-[#c8962e] transition-colors">
            {counts.locations} <span className="text-white/50 font-normal">měst</span>
          </Link>
          <span className="text-white/20">·</span>
          <span className="text-sm font-bold text-white">
            {counts.edges.toLocaleString("cs-CZ")} <span className="text-white/50 font-normal">vazeb</span>
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
         TRENDUJÍCÍ INTERPRETI
         ═══════════════════════════════════════════════════════════════ */}
      <TrendingArtists artists={trendingArtists} />

      {/* ═══════════════════════════════════════════════════════════════
         TRENDUJÍCÍ ALBA
         ═══════════════════════════════════════════════════════════════ */}
      <TrendingAlbums albums={trendingAlbums} />

      {/* ═══════════════════════════════════════════════════════════════
         NEJPROPOJENĚJŠÍ INTERPRETI — síťový graf
         ═══════════════════════════════════════════════════════════════ */}
      {layout && (
        <section className="mb-16">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/35">
              Nejpropojenější interpreti
            </h2>
            <Link
              href="/scena"
              className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-[#c8962e] transition-colors"
            >
              Celá síť →
            </Link>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6 sm:p-8">
            <NetworkGraph layout={layout} />
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         OBJEV SCÉNU
         ═══════════════════════════════════════════════════════════════ */}
      <DiscoverScene cities={cities} labels={labels} />

      {/* ═══════════════════════════════════════════════════════════════
         POSLEDNÍ PŘIDANÉ PROFILY
         ═══════════════════════════════════════════════════════════════ */}
      <RecentFeed items={recentFeed} />

      {/* ═══════════════════════════════════════════════════════════════
         DATABASE STATS — "nejsi na blogu"
         ═══════════════════════════════════════════════════════════════ */}
      <DatabaseStats counts={counts} />

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
    </>
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${RAP44_API}/entities/RapEvent?limit=20`, {
      headers: { api_key: RAP44_KEY },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);
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
