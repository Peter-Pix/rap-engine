import { getArtistImage } from "@/lib/content/images";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveFromSlug, getRouteParamsForType } from "@/lib/content/route-resolver";
import { readEntityById, readInboundFor, readEntities } from "@/lib/content/cache-reader";
import { renderMdx } from "@/lib/content/mdx";
import { getRegistryEntry } from "@/lib/content/relation-registry";
import {
  getSimilarArtists,
  getRelatedEntities,
  DEFAULT_WEIGHTS,
} from "@/lib/content/graph-query";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { Tracklist } from "@/components/content/tracklist";
import { UpcomingEventsForArtist } from "@/components/content/upcoming-events";

// ─── Types ────────────────────────────────────────────────────────────────

interface ResolvedTarget {
  id: string;
  type: string;
  slug: string;
  title: string;
  route: string;
}

// ─── Metadata ─────────────────────────────────────────────────────────────

export function generatePageMetadata(
  type: string,
  slug: string,
): Metadata | null {
  const id = resolveFromSlug(type, slug);
  if (!id) return null;
  const entity = readEntityById(id);
  if (!entity) return null;

  // Draft entities = noindex, follow (Google can still discover via links, but won't index)
  const extraMeta = (entity as any).extraMeta || {};
  const isDraft = extraMeta.status === "draft" ||
                   extraMeta.isStub === true ||
                   (entity as any).status === "draft";

  return {
    title: entity.title,
    description: entity.description || undefined,
    robots: isDraft ? { index: false, follow: true } : undefined,
    openGraph: {
      title: entity.title,
      description: entity.description || undefined,
      type: "article",
    },
  };
}

// ─── Static Params ────────────────────────────────────────────────────────

export function generatePageStaticParams(type: string) {
  return getRouteParamsForType(type).map(({ slug }) => ({ slug }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getEntityLabel(type: string): string {
  const map: Record<string, string> = {
    genre: "Žánry",
    style: "Styly",
    theme: "Témata",
    mood: "Nálady",
    scene: "Scény",
    location: "Lokality",
    label: "Labely",
    artist: "Umělci",
    album: "Alba",
    track: "Skladby",
  };
  return map[type] ?? type;
}

// ─── Shared Page Component ────────────────────────────────────────────────

export async function EntityPage({
  type,
  slug,
}: {
  type: string;
  slug: string;
}): Promise<React.ReactNode> {
  const id = resolveFromSlug(type, slug);
  if (!id) notFound();

  const entity = readEntityById(id);
  if (!entity) notFound();

  const allEntities = readEntities();

  // ── Build entity index ───────────────────────────────────────────────
  const entityIndex: Record<string, ResolvedTarget> = {};
  if (allEntities) {
    for (const [eid, e] of Object.entries(allEntities)) {
      entityIndex[eid] = {
        id: eid,
        type: e.type,
        slug: e.slug,
        title: e.title,
        route: `${TYPE_ROUTE_MAP[e.type as EntityType] ?? `/${e.type}`}/${e.slug}`,
      };
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────
  const totalEdges = entity.outbound
    ? Object.values(entity.outbound).reduce((sum, arr) => sum + arr.length, 0)
    : 0;
  const inboundIds = readInboundFor(id);

  // ── Load tracklist for albums ──────────────────────────────────────
  let tracklistData: any | null = null;
  if (entity.type === "album") {
    const tracksPath = join(
      process.cwd(),
      "content/entities",
      entity.id,
      "tracks.json"
    );
    if (existsSync(tracksPath)) {
      try {
        tracklistData = JSON.parse(await readFile(tracksPath, "utf-8"));
      } catch {}
    }
  }

  // ── Profile & extra meta ─────────────────────────────────────────────
  const profile = entity.profile as Record<string, any> | undefined;
  const em = (entity.extraMeta ?? {}) as Record<string, string | undefined>;

  // ── Relation groups ──────────────────────────────────────────────────
  const relations: Array<{
    key: string;
    label: string;
    targets: ResolvedTarget[];
  }> = [];
  for (const [authoringKey, targetIds] of Object.entries(entity.outbound)) {
    if (!targetIds.length) continue;
    const entry = getRegistryEntry(authoringKey);
    const label = entry?.description ?? authoringKey;
    const targets = targetIds
      .map((tid) => entityIndex[tid])
      .filter(Boolean) as ResolvedTarget[];
    if (targets.length > 0) {
      relations.push({ key: authoringKey, label, targets });
    }
  }

  // ── Graph queries ────────────────────────────────────────────────────
  const similar =
    entity.type === "artist"
      ? getSimilarArtists(id, DEFAULT_WEIGHTS, 0.1, 5)
      : [];
  const related = getRelatedEntities(id, 8).filter((r) => r.id !== id);

  const imageUrl =
    entity.type === "artist" ? getArtistImage(entity.slug) : null;

  return (
    <main className="max-w-5xl mx-auto">

      {/* ═══════════════════════════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════════════════════════ */}
      {imageUrl ? (
        <div className="relative w-full h-[400px] sm:h-[520px] overflow-hidden">
          <img
            src={imageUrl}
            alt={entity.title}
            className="h-full w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-white uppercase leading-[0.85] max-w-3xl">
              {entity.title}
            </h1>
          </div>
        </div>
      ) : (
        <div className="pt-24 sm:pt-32 pb-6 px-8 sm:px-12">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-white uppercase leading-[0.85]">
            {entity.title}
          </h1>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         META BAR — just text, no icons
         ═══════════════════════════════════════════════════════════════ */}
      {(em.realName || em.origin || em.label || em.activeSince) && (
        <div className="px-8 sm:px-12 pt-6 pb-2">
          <p className="text-sm text-white/50 font-mono tracking-wide">
            {[em.realName, em.origin || em.city, em.label, em.activeSince ? `Od ${em.activeSince as string}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         PULL QUOTE + DESCRIPTION
         ═══════════════════════════════════════════════════════════════ */}
      {(entity.description || profile?.oneLiner) && (
        <div className="px-8 sm:px-12 pt-8 pb-8">
          {profile?.oneLiner && (
            <p className="text-2xl sm:text-3xl font-light italic text-[#c8962e] leading-tight mb-6 max-w-2xl">
              &ldquo;{profile.oneLiner as string}&rdquo;
            </p>
          )}
          {entity.description && (
            <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-3xl">
              {entity.description}
            </p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         TWO-COLUMN LAYOUT
         ═══════════════════════════════════════════════════════════════ */}
      <div className="px-8 sm:px-12 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-x-16 gap-y-12">

        {/* ── LEFT COLUMN: Editorial Content ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-12">

          {/* MDX content first */}
          {entity.content?.trim() && (
            <div className="prose prose-invert max-w-none text-white/80">
              {renderMdx(entity.content)}
            </div>
          )}

          {/* Tracklist for albums (from Deezer) */}
          {tracklistData && (
            <Tracklist data={tracklistData} albumSlug={entity.slug} />
          )}

          {/* Upcoming events for artists (from 44rap) */}
          {entity.type === "artist" && (
            <UpcomingEventsForArtist artistName={entity.title} />
          )}

          {/* Profile editorial sections */}
          {profile && !entity.content?.trim() && (
            <>
              {profile.careerSummary && (
                <section>
                  <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                    Kariéra
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                    {profile.careerSummary as string}
                  </p>
                </section>
              )}

              {profile.whatMakesUnique && (
                <section>
                  <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                    V čem je jiný
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                    {profile.whatMakesUnique as string}
                  </p>
                </section>
              )}

              {profile.influence && (
                <section>
                  <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                    Vliv a dopad
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                    {profile.influence as string}
                  </p>
                </section>
              )}

              {profile.controversy && (
                <section>
                  <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                    Kontroverze
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                    {profile.controversy as string}
                  </p>
                </section>
              )}

              {profile.generationContext && (
                <section>
                  <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                    Generační kontext
                  </h2>
                  <p className="text-sm sm:text-base text-white/75 leading-[1.75]">
                    {profile.generationContext as string}
                  </p>
                </section>
              )}

              {profile.funFacts &&
                Array.isArray(profile.funFacts) &&
                (profile.funFacts as string[]).length > 0 && (
                  <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                      Fakta a zajímavosti
                    </h2>
                    <ol className="space-y-3">
                      {(profile.funFacts as string[]).map((fact: string, i: number) => (
                        <li key={i} className="flex gap-4 text-sm sm:text-base text-white/75 leading-relaxed">
                          <span className="text-[#c8962e] font-mono text-xs mt-0.5 shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
            </>
          )}

          {/* ── Similar Artists ───────────────────────────────────────── */}
          {similar.length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Podobní umělci
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {similar.map((s) => {
                  const target = entityIndex[s.id];
                  if (!target) return null;
                  return (
                    <a key={s.id} href={target.route} className="text-sm text-white/60 hover:text-white transition-colors">
                      {target.title}
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Related Entities ──────────────────────────────────────── */}
          {related.length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Související
              </h2>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {related.map((r) => {
                  const target = entityIndex[r.id];
                  if (!target) return null;
                  return (
                    <a key={r.id} href={target.route} className="text-sm text-white/60 hover:text-white transition-colors">
                      {target.title}
                      <span className="text-white/20 ml-1.5 text-xs">{getEntityLabel(target.type)}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Backlinks ─────────────────────────────────────────────── */}
          {inboundIds.length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Odkazují sem ({inboundIds.length})
              </h2>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {inboundIds.map((bid) => {
                  const target = entityIndex[bid];
                  if (!target) return null;
                  return (
                    <a key={bid} href={target.route} className="text-sm text-white/60 hover:text-white transition-colors">
                      {target.title}
                      <span className="text-white/20 ml-1.5 text-xs">{getEntityLabel(target.type)}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── RIGHT COLUMN: Sidebar ──────────────────────────────────── */}
        <div className="space-y-10 lg:pt-1">

          {/* Info */}
          {em.realName || em.origin || em.label || em.activeSince || em.birthDate ? (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Info
              </h2>
              <dl className="space-y-2.5 text-sm">
                {em.realName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Jméno</dt>
                    <dd className="text-white/75 text-right">{em.realName as string}</dd>
                  </div>
                )}
                {em.origin && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Původ</dt>
                    <dd className="text-white/75 text-right">{em.origin as string}</dd>
                  </div>
                )}
                {em.label && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Label</dt>
                    <dd className="text-white/75 text-right">{em.label as string}</dd>
                  </div>
                )}
                {em.activeSince && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Aktivní</dt>
                    <dd className="text-white/75 text-right">{em.activeSince as string}</dd>
                  </div>
                )}
                {em.birthDate && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Narození</dt>
                    <dd className="text-white/75 text-right">{em.birthDate as string}</dd>
                  </div>
                )}
              </dl>
            </section>
          ) : null}

          {/* Style tags */}
          {profile?.styleTags && Array.isArray(profile.styleTags) && (profile.styleTags as string[]).length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Žánry
              </h2>
              <p className="text-sm text-white/75 leading-relaxed">
                {(profile.styleTags as string[]).join(" · ")}
              </p>
            </section>
          )}

          {/* Themes */}
          {profile?.themes && Array.isArray(profile.themes) && (profile.themes as string[]).length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Témata
              </h2>
              <p className="text-sm text-white/75 leading-relaxed">
                {(profile.themes as string[]).join(" · ")}
              </p>
            </section>
          )}

          {/* Key Albums */}
          {profile?.keyAlbums && Array.isArray(profile.keyAlbums) && (profile.keyAlbums as any[]).length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Klíčová alba
              </h2>
              <ol className="space-y-3">
                {(profile.keyAlbums as any[]).map((album: any, i: number) => {
                  // Support both string[] and {title, year, description}[]
                  if (typeof album === "string") {
                    return (
                      <li key={i} className="text-sm text-white/75">
                        {album}
                      </li>
                    );
                  }
                  return (
                    <li key={i}>
                      <div className="text-sm font-semibold text-white">
                        {album.title}
                        {album.year && (
                          <span className="ml-2 text-xs text-white/40 font-mono">{album.year}</span>
                        )}
                      </div>
                      {album.description && (
                        <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
                          {album.description}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Key Tracks */}
          {profile?.keyTracks && Array.isArray(profile.keyTracks) && (profile.keyTracks as string[]).length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Klíčové tracky
              </h2>
              <ol className="space-y-1">
                {(profile.keyTracks as string[]).map((track: string, i: number) => (
                  <li key={i} className="text-sm text-white/75">{track}</li>
                ))}
              </ol>
            </section>
          )}

          {/* Graph stats */}
          <section>
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
              V síti
            </h2>
            <p className="text-sm text-white/50">{totalEdges} vazeb · {inboundIds.length} odkazů</p>
          </section>

          {/* Relations */}
          {relations.length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Vazby
              </h2>
              <div className="space-y-3">
                {relations.map(({ key, label, targets }) => (
                  <div key={key}>
                    <dt className="text-white/30 text-[10px] font-mono uppercase tracking-wide mb-1.5">
                      {label}
                    </dt>
                    <dd className="flex flex-wrap gap-x-2">
                      {targets.map((t, i) => (
                        <span key={t.id}>
                          <a href={t.route} className="text-sm text-white/60 hover:text-white transition-colors">
                            {t.title}
                          </a>
                          {i < targets.length - 1 && <span className="text-white/20 ml-1">·</span>}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}