import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildJsonLd } from "@/lib/seo/schema-org";
import { renderMdx } from "@/lib/content/mdx";
import { TYPE_ROUTE_MAP } from "@/lib/content/constants";
import type { EntityType } from "@/lib/content/constants";

const BASE_URL = "https://4rap.cz";

interface EntityRef {
  id: string;
  type: string;
  slug: string;
  title: string;
}

interface TrackDetailProps {
  entity: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    image?: string | null;
    publishedAt?: string;
    content?: string;
    outbound?: Record<string, string[]>;
    profile?: Record<string, unknown> | null;
    extraMeta?: Record<string, unknown> | null;
  };
  allEntities: Record<string, EntityRef>;
  inboundIds: string[];
}

function resolveUrl(e: EntityRef): string {
  const prefix = TYPE_ROUTE_MAP[e.type as EntityType] ?? `/${e.type}`;
  return `${prefix}/${e.slug}`;
}

function resolveTargets(
  ids: string[] | undefined,
  all: Record<string, EntityRef>,
): EntityRef[] {
  if (!ids) return [];
  return ids.map((id) => all[id]).filter(Boolean) as EntityRef[];
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function EmbedPlayer({
  spotifyUrl,
  youtubeUrl,
}: {
  spotifyUrl?: string;
  youtubeUrl?: string;
}) {
  const spotifyEmbed = spotifyUrl
    ? spotifyUrl
        .replace("open.spotify.com/track/", "open.spotify.com/embed/track/")
        .replace("open.spotify.com/album/", "open.spotify.com/embed/album/")
    : null;

  return (
    <div className="space-y-4">
      {spotifyEmbed && (
        <iframe
          src={spotifyEmbed}
          width="100%"
          height="80"
          style={{ borderRadius: "8px" }}
          allowTransparency
          allow="encrypted-media"
          loading="lazy"
          title="Spotify player"
        />
      )}
      {youtubeUrl && (
        <div className="aspect-video bg-black/40 rounded-lg overflow-hidden">
          <iframe
            src={youtubeUrl.replace("watch?v=", "embed/")}
            width="100%"
            height="100%"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="YouTube player"
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

export function TrackDetail({ entity, allEntities, inboundIds }: TrackDetailProps) {
  const out = entity.outbound ?? {};
  const em = entity.profile ?? {};

  // Resolve relations
  const artists = resolveTargets(out.HAS_ARTIST, allEntities);
  const albums = resolveTargets(out.BELONGS_TO_ALBUM, allEntities);
  const features = resolveTargets(out.FEATURES, allEntities);
  const producers = resolveTargets(out.PRODUCED_BY, allEntities);
  const labels = resolveTargets(out.RELEASED_BY, allEntities);
  const themes = resolveTargets(out.HAS_THEME, allEntities);
  const styles = resolveTargets(out.HAS_STYLE, allEntities);
  const moods = resolveTargets(out.HAS_MOOD, allEntities);

  // Metadata
  const year = entity.publishedAt?.slice(0, 4);
  const duration = formatDuration((em as any).duration as number | undefined);
  const isExplicit = (em as any).explicit as boolean | undefined;
  const sources = (em as any).sources as string[] | undefined;
  const spotifyUrl = sources?.find((s) => s.includes("spotify.com"));
  const youtubeUrl = sources?.find((s) => s.includes("youtube.com") || s.includes("youtu.be"));

  // JSON-LD
  const jsonLd = buildJsonLd({
    entity: {
      id: entity.id,
      type: "track" as any,
      slug: entity.slug,
      title: entity.title,
      description: entity.description,
      image: entity.image ?? null,
      publishedAt: entity.publishedAt,
      outbound: out as any,
      profile: em as any,
      extraMeta: em as any,
    },
    inboundIds,
    allEntities: Object.fromEntries(
      Object.entries(allEntities).map(([k, v]) => [
        k,
        { ...v, type: v.type as any },
      ]),
    ),
    baseUrl: BASE_URL,
  });

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <main className="max-w-5xl mx-auto">
        {/* ═══════════════════════════════════════════════════════════════
           HERO
           ═══════════════════════════════════════════════════════════════ */}
        <div className="pt-24 sm:pt-32 pb-6 px-8 sm:px-12">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white uppercase leading-[0.85]">
            {entity.title}
          </h1>

          {/* Primary artist + album */}
          <div className="mt-4 text-lg sm:text-xl text-white/70">
            {artists.length > 0 && (
              <span>
                od{" "}
                {artists.map((a, i) => (
                  <span key={a.id}>
                    <Link
                      href={resolveUrl(a)}
                      className="text-[#c8962e] hover:underline transition-colors"
                    >
                      {a.title}
                    </Link>
                    {i < artists.length - 1 ? ", " : ""}
                  </span>
                ))}
              </span>
            )}
            {albums.length > 0 && (
              <span>
                {" "}
                · album{" "}
                <Link
                  href={resolveUrl(albums[0])}
                  className="text-white/50 hover:text-[#c8962e] hover:underline transition-colors"
                >
                  {albums[0].title}
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
           META BAR
           ═══════════════════════════════════════════════════════════════ */}
        <div className="px-8 sm:px-12 pt-2 pb-6">
          <p className="text-sm text-white/50 font-mono tracking-wide flex flex-wrap items-center gap-x-3 gap-y-1">
            {year && <span>{year}</span>}
            {duration && (
              <>
                <span className="text-white/20">·</span>
                <span>{duration}</span>
              </>
            )}
            {isExplicit && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-white/30 border border-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  E
                </span>
              </>
            )}
            {labels.length > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span>
                  {labels.map((l, i) => (
                    <span key={l.id}>
                      <Link
                        href={resolveUrl(l)}
                        className="hover:text-[#c8962e] transition-colors"
                      >
                        {l.title}
                      </Link>
                      {i < labels.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
              </>
            )}
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
           TWO-COLUMN LAYOUT
           ═══════════════════════════════════════════════════════════════ */}
        <div className="px-8 sm:px-12 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-x-16 gap-y-12">
          {/* ── LEFT COLUMN: Editorial Content ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            {entity.description && (
              <p className="text-base sm:text-lg text-white/70 leading-relaxed">
                {entity.description}
              </p>
            )}

            {/* MDX Content (O skladbě) */}
            {entity.content?.trim() && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  O skladbě
                </h2>
                <div className="prose prose-invert max-w-none text-white/80">
                  {renderMdx(entity.content)}
                </div>
              </section>
            )}

            {/* Profile sections (fallback when no MDX) */}
            {!entity.content?.trim() && em && (
              <>
                {(em as any).summary && (
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                      O čem je
                    </h2>
                    <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                      {(em as any).summary as string}
                    </p>
                  </section>
                )}

                {(em as any).context && (
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                      Kontext
                    </h2>
                    <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                      {(em as any).context as string}
                    </p>
                  </section>
                )}

                {(em as any).production && (
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                      Produkce
                    </h2>
                    <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                      {(em as any).production as string}
                    </p>
                  </section>
                )}

                {(em as any).interpretation && (
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                      Interpretace
                    </h2>
                    <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                      {(em as any).interpretation as string}
                    </p>
                  </section>
                )}

                {(em as any).impact && (
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                      Dopad
                    </h2>
                    <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                      {(em as any).impact as string}
                    </p>
                  </section>
                )}
              </>
            )}

            {/* Music embeds */}
            {(spotifyUrl || youtubeUrl) && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Přehrání
                </h2>
                <EmbedPlayer spotifyUrl={spotifyUrl} youtubeUrl={youtubeUrl} />
              </section>
            )}
          </div>

          {/* ── RIGHT COLUMN: Sidebar ───────────────────────────────────── */}
          <div className="space-y-10">
            {/* Featuring */}
            {features.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Hostující
                </h2>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f.id}>
                      <Link
                        href={resolveUrl(f)}
                        className="text-sm text-white hover:text-[#c8962e] transition-colors"
                      >
                        {f.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Producers */}
            {producers.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Produkce
                </h2>
                <ul className="space-y-2">
                  {producers.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={resolveUrl(p)}
                        className="text-sm text-white hover:text-[#c8962e] transition-colors"
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Album */}
            {albums.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Album
                </h2>
                <Link
                  href={resolveUrl(albums[0])}
                  className="text-sm text-white hover:text-[#c8962e] transition-colors block"
                >
                  {albums[0].title}
                </Link>
              </section>
            )}

            {/* Themes */}
            {themes.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Témata
                </h2>
                <div className="flex flex-wrap gap-2">
                  {themes.map((t) => (
                    <Link
                      key={t.id}
                      href={resolveUrl(t)}
                      className="text-[11px] text-white/60 hover:text-[#c8962e] border border-white/10 hover:border-[#c8962e]/40 px-2.5 py-1 transition-colors"
                    >
                      {t.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Styles */}
            {styles.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Styly
                </h2>
                <div className="flex flex-wrap gap-2">
                  {styles.map((s) => (
                    <Link
                      key={s.id}
                      href={resolveUrl(s)}
                      className="text-[11px] text-white/60 hover:text-[#c8962e] border border-white/10 hover:border-[#c8962e]/40 px-2.5 py-1 transition-colors"
                    >
                      {s.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Moods */}
            {moods.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Nálady
                </h2>
                <div className="flex flex-wrap gap-2">
                  {moods.map((m) => (
                    <Link
                      key={m.id}
                      href={resolveUrl(m)}
                      className="text-[11px] text-white/60 hover:text-[#c8962e] border border-white/10 hover:border-[#c8962e]/40 px-2.5 py-1 transition-colors"
                    >
                      {m.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
