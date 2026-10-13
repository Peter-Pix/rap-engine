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
import { existsSync, readFileSync } from "fs";
import { Tracklist } from "@/components/content/tracklist";
import { UpcomingEventsForArtist } from "@/components/content/upcoming-events";
import { KeyTrackPlayer } from "@/components/content/key-track-player";
import { JsonLd } from "@/components/seo/JsonLd";
import FeedbackForm from "@/components/content/FeedbackForm";
import { EntityJumpNav } from "@/components/entity/EntityJumpNav";
import { buildJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/schema-org";

// ─── Constants ────────────────────────────────────────────────────────────

/** Canonical site base URL — použito v JSON-LD @id a OG URL. */
const BASE_URL = "https://4rap.cz";

// ─── Helpers: formátování faktů a zdrojů ────────────────────────────────

/** "1985-12-04" → "4. prosince 1985" (nebo původní string, když není ISO datum). */
function formatDate(value: string | undefined): string | null {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(value);
  const y = m[1], mo = m[2], d = m[3];
  const months = [
    "ledna", "února", "března", "dubna", "května", "června",
    "července", "srpna", "září", "října", "listopadu", "prosince",
  ];
  const mi = parseInt(mo, 10) - 1;
  if (mi < 0 || mi > 11) return `${d}.${mo}.${y}`;
  return `${parseInt(d, 10)}. ${months[mi]} ${y}`;
}

/** Sjednotí zdroje ze 3 formátů (sourceUrls list / dict / extraMeta.sourceUrl)
 *  na plochý seznam URL + lidský popisek typu zdroje. */
function extractSources(extraMeta: Record<string, any> | undefined): { url: string; label: string }[] {
  if (!extraMeta) return [];
  const out: { url: string; label: string }[] = [];
  const push = (u: unknown) => {
    if (typeof u !== "string" || !u.startsWith("http")) return;
    const url = u;
    let label = "Zdroj";
    if (url.includes("discogs.com")) label = "Discogs";
    else if (url.includes("deezer.com")) label = "Deezer";
    else if (url.includes("wikipedia.org")) label = "Wikipedia";
    else if (url.includes("musicbrainz.org")) label = "MusicBrainz";
    else if (url.includes("wikidata.org")) label = "Wikidata";
    out.push({ url, label });
  };
  // top-level sourceUrls / sourceUrl / source
  for (const key of ["sourceUrls", "sourceUrl", "sources", "source"]) {
    const v = (extraMeta as any)[key];
    if (Array.isArray(v)) v.forEach(push);
    else if (v && typeof v === "object") Object.values(v).forEach(push);
    else push(v);
  }
  // dedup podle URL
  const seen = new Set<string>();
  return out.filter((x) => {
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

/** Vizuální štítek stavu ověření entity. */
function verificationBadge(verification: string | undefined): { label: string; cls: string } | null {
  switch (verification) {
    case "verified":
      return { label: "Ověřeno", cls: "text-emerald-400/80 border-emerald-400/30" };
    case "partial":
      return { label: "Částečně ověřeno", cls: "text-amber-400/80 border-amber-400/30" };
    case "unverified":
      return { label: "Neověřeno", cls: "text-white/40 border-white/15" };
    default:
      return null;
  }
}


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

  // Draft / stub / explicit-noindex entity = noindex, follow (Google can still
  // discover via links, ale neindexuje). Používá se pro entity bez obsahu —
  // např. tisíce skladeb importovaných z tracklistů, dokud nedostanou popis.
  const extraMeta = (entity as any).extraMeta || {};
  const isDraft = extraMeta.status === "draft" ||
                   extraMeta.isStub === true ||
                   extraMeta.noindex === true ||
                   (entity as any).status === "draft";

  // OG image — dynamický brandovaný obrázek (1200×630) přes /og route:
  // cover/foto entity + typ + název na tmavém pozadí se zlatým akcentem.
  // Pro entity bez obrázku route vykreslí čistý textový layout.
  const ogImageUrl = `${BASE_URL}/og/${entity.type}/${entity.slug}`;

  return {
    title: entity.title,
    description: entity.description || undefined,
    robots: isDraft ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: `${BASE_URL}${TYPE_ROUTE_MAP[entity.type as EntityType] ?? `/${entity.type}`}/${entity.slug}`,
    },
    openGraph: {
      title: entity.title,
      description: entity.description || undefined,
      type: entity.type === "artist" || entity.type === "album" ? "music.song" : "article",
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, alt: entity.title }] } : {}),
    },
    twitter: ogImageUrl
      ? { card: "summary_large_image", images: [ogImageUrl] }
      : undefined,
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

// ─── Track route index (memoizováno) ───────────────────────────────────────
// Mapa Deezer track ID / ISRC → naše route. Staví se JEDNOU za proces
// (build worker), ne per stránku. Bez memoizace je to O(n²) a shodí build.
let _trackRouteIndex: { deezerIdToRoute: Record<string, string>; isrcToRoute: Record<string, string> } | null = null;

function getTrackRouteIndex() {
  if (_trackRouteIndex) return _trackRouteIndex;
  const deezerIdToRoute: Record<string, string> = {};
  const isrcToRoute: Record<string, string> = {};
  const all = readEntities();
  if (all) {
    for (const e of Object.values(all)) {
      if ((e as any).type !== "track") continue;
      const route = `/skladby/${(e as any).slug}`;
      const srcs = ((e as any).extraMeta?.sources ?? []) as string[];
      for (const src of srcs) {
        const m = String(src).match(/deezer\.com\/track\/(\d+)/);
        if (m) deezerIdToRoute[m[1]] = route;
      }
      const isrc = (e as any).extraMeta?.isrc;
      if (typeof isrc === "string" && isrc) isrcToRoute[isrc.toUpperCase()] = route;
    }
  }
  _trackRouteIndex = { deezerIdToRoute, isrcToRoute };
  return _trackRouteIndex;
}

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

  // ── Diskografie (chronologie alb) ─────────────────────────────────
  // Seřadí alba interpreta podle roku sestupně. Data z cache (bez disk I/O).
  const discography: Array<{ id: string; title: string; slug: string; year: number | null }> =
    entity.type === "artist"
      ? (entity.outbound?.HAS_ALBUM || [])
          .map((aid) => {
            const e = allEntities?.[aid] as any;
            if (!e) return null;
            const year = typeof e?.extraMeta?.year === "number" ? e.extraMeta.year : null;
            return { id: aid, title: e.title, slug: e.slug, year };
          })
          .filter((x): x is { id: string; title: string; slug: string; year: number | null } => x !== null)
          .sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity))
      : [];

  // ── Stats ────────────────────────────────────────────────────────────
  const inboundIds = readInboundFor(id);
  const totalEdges = entity.outbound
    ? Object.values(entity.outbound).reduce((sum, arr) => sum + arr.length, 0)
    : 0;
  const totalConnections = totalEdges + inboundIds.length;

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

  // ── Deezer track ID → naše track route (pro proklikání ze seznamu) ───
  // Mapu (deezerId/isrc → route) stavíme JEDNOU a memoizujeme na module-level.
  // POZOR: nestavět per stránku — iterace všech 5 778 entit pro každou ze 360
  // album stránek = O(n²) → build padal na OOM/SIGKILL (12. 10. 2026).
  const trackRoutes: Record<string, string> = {};
  if (entity.type === "album" && tracklistData) {
    const { deezerIdToRoute, isrcToRoute } = getTrackRouteIndex();
    for (const t of (tracklistData.tracks ?? [])) {
      const dzId = String(t.link ?? "").match(/track\/(\d+)/)?.[1];
      let route: string | undefined;
      if (dzId && deezerIdToRoute[dzId]) route = deezerIdToRoute[dzId];
      else if (t.isrc && isrcToRoute[String(t.isrc).toUpperCase()]) route = isrcToRoute[String(t.isrc).toUpperCase()];
      if (route) trackRoutes[String(t.position)] = route;
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
    entity.type === "artist"
      ? getArtistImage(entity.slug)
      : entity.type === "album" && entity.image
        ? entity.image
        : null;

  // Schema.org JSON-LD — generuje se pro všechny indexovatelné entity (draft = null).
  const jsonLd = buildJsonLd({
    entity: {
      id: entity.id,
      type: entity.type as any,
      slug: entity.slug,
      title: entity.title,
      description: entity.description,
      image: entity.image ?? null,
      publishedAt: entity.publishedAt,
      outbound: entity.outbound as any,
      profile: (entity.profile as Record<string, unknown>) ?? null,
      extraMeta: (entity.extraMeta as Record<string, unknown>) ?? null,
      // Album tracks.json (only for album type, when loaded)
      tracks: entity.type === "album" && tracklistData ? (tracklistData as any) : null,
    },
    inboundIds,
    allEntities: allEntities as any,
    baseUrl: BASE_URL,
  });

  // BreadcrumbList — drobečková navigace pro Google (Home → sekce → entita).
  const breadcrumbLd = buildBreadcrumbJsonLd(
    entity.type,
    entity.slug,
    entity.title,
    BASE_URL,
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      {breadcrumbLd && <JsonLd data={breadcrumbLd} />}
      <main className="max-w-5xl mx-auto">

      {/* ═══════════════════════════════════════════════════════════════
         HERO
         ═══════════════════════════════════════════════════════════════ */}
      {imageUrl ? (
        <div className="relative w-full h-[400px] sm:h-[520px] overflow-hidden">
          <img
            src={imageUrl}
            alt={entity.title}
            fetchPriority="high"
            decoding="async"
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
         PULL QUOTE + DESCRIPTION (redakční souhrn — vizuálně oddělený
         od strukturovaných faktů v Info kartě; není to ověřený fakt)
         ═══════════════════════════════════════════════════════════════ */}
      {entity.description && (
        <div className="px-8 sm:px-12 pt-8 pb-8">
          {entity.description && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/35 mb-2">
                Souhrn
              </p>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-3xl">
                {entity.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         POZNÁMKA / KONTEXT — doplňující redakční text (není ověřený fakt)
         ═══════════════════════════════════════════════════════════════ */}
      {em.note && (
        <div className="px-8 sm:px-12 pb-8">
          <div className="border-l-2 border-[#c8962e]/40 pl-4 py-1">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#c8962e]/70 mb-2">
              Kontext
            </p>
            <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
              {em.note as string}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         JUMP NAV — rychlá orientace na dlouhé stránce (auto-detekce sekcí)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="px-4 sm:px-12">
        <EntityJumpNav />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         TWO-COLUMN LAYOUT
         ═══════════════════════════════════════════════════════════════ */}
      <div className="px-8 sm:px-12 pb-16 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-x-16 gap-y-12">

        {/* ── LEFT COLUMN: Editorial Content ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-12" data-jump-section data-jump-label="Profil">

          {/* MDX content first */}
          {entity.content?.trim() && (
            <div className="prose prose-invert max-w-none text-white/80">
              {renderMdx(entity.content)}
            </div>
          )}

          {/* Tracklist for albums (from Deezer) — jediný seznam skladeb */}
          {tracklistData && (
            <Tracklist data={tracklistData} albumSlug={entity.slug} trackRoutes={trackRoutes} />
          )}

          {/* Diskografie — chronologie alb interpreta (rok sestupně) */}
          {entity.type === "artist" && discography.length > 0 && (
            <section data-jump-section data-jump-label="Diskografie">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-5">
                Diskografie
              </h2>
              <ol className="relative border-l border-white/10 ml-2">
                {discography.map((al, i) => (
                  <li key={al.id} className="relative pl-6 pb-5 last:pb-0">
                    <span className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-[#c8962e]/70" />
                    <div className="flex items-baseline gap-3">
                      <span className="text-[11px] font-mono text-white/35 tabular-nums w-12 flex-shrink-0">
                        {al.year ?? "—"}
                      </span>
                      <a
                        href={`/alba/${al.slug}`}
                        className="text-sm text-white/75 hover:text-[#c8962e] transition-colors"
                      >
                        {al.title}
                      </a>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Upcoming events for artists (from 44rap) */}
          {entity.type === "artist" && (
            <UpcomingEventsForArtist artistName={entity.title} />
          )}

          {/* AI editorial bloky z profile.json jsou VYPNUTÉ —
              byly to generované fráze bez zdrojů (superpower, controversy,
              generationContext...). Fakta patří do MDX, ne do profile.json. */}
          {/* ── Similar Artists ───────────────────────────────────────── */}
          {similar.length > 0 && (
            <section data-jump-section data-jump-label="Podobní">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
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

          {/* ── Cesta v grafu (CTA) ─────────────────────────────────── */}
          {entity.type === "artist" && (
            <section>
              <a
                href={`/cesta?from=${encodeURIComponent(id)}`}
                className="inline-flex items-center gap-2 text-sm text-[#c8962e] hover:text-[#d8a53a] transition-colors"
              >
                <span className="text-base leading-none">⌁</span>
                Najdi cestu k jinému rapperovi →
              </a>
            </section>
          )}

          {/* ── Related Entities ──────────────────────────────────────── */}
          {related.length > 0 && (
            <section data-jump-section data-jump-label="Související">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
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
            <section data-jump-section data-jump-label="Odkazují sem">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
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
            <section data-jump-section data-jump-label="Info">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40">
                  Info
                </h2>
                {(() => {
                  const b = verificationBadge(em.verification);
                  return b ? (
                    <span className={`text-[10px] font-mono uppercase tracking-wider border rounded px-1.5 py-0.5 ${b.cls}`}>
                      {b.label}
                    </span>
                  ) : null;
                })()}
              </div>
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
                    <dd className="text-white/75 text-right">{formatDate(em.birthDate) as string}</dd>
                  </div>
                )}
                {em.city && em.city !== em.origin && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Scéna</dt>
                    <dd className="text-white/75 text-right">{em.city as string}</dd>
                  </div>
                )}
                {em.occupation && (Array.isArray(em.occupation) ? (em.occupation as string[]).length > 0 : true) && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Role</dt>
                    <dd className="text-white/75 text-right">
                      {(Array.isArray(em.occupation) ? em.occupation : [em.occupation]).join(", ")}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          ) : null}

          {/* Zdroje — ověřitelné odkazy (Wikipedia / Discogs / Deezer / MusicBrainz) */}
          {(() => {
            const srcs = extractSources(em);
            if (srcs.length === 0) return null;
            return (
              <section data-jump-section data-jump-label="Zdroje">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40">
                    Zdroje
                  </h2>
                  {(() => {
                    const b = verificationBadge(em.verification);
                    return b ? (
                      <span className={`text-[10px] font-mono uppercase tracking-wider border rounded px-1.5 py-0.5 ${b.cls}`}>
                        {b.label}
                      </span>
                    ) : null;
                  })()}
                </div>
                <ul className="space-y-1.5 text-sm">
                  {srcs.map((s, i) => (
                    <li key={i}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-[#c8962e] transition-colors"
                      >
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/35 border border-white/10 rounded px-1 py-0.5">
                          {s.label}
                        </span>
                        <span className="truncate max-w-[200px]">{s.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}

          {/* Style tags */}
          {profile?.styleTags && Array.isArray(profile.styleTags) && (profile.styleTags as string[]).length > 0 && (
            <section data-jump-section data-jump-label="Žánry">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Žánry
              </h2>
              <p className="text-sm text-white/75 leading-relaxed">
                {(profile.styleTags as string[]).join(" · ")}
              </p>
            </section>
          )}

          {/* Themes */}
          {profile?.themes && Array.isArray(profile.themes) && (profile.themes as string[]).length > 0 && (
            <section data-jump-section data-jump-label="Témata">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Témata
              </h2>
              <p className="text-sm text-white/75 leading-relaxed">
                {(profile.themes as string[]).join(" · ")}
              </p>
            </section>
          )}

          {/* Key Albums - cover grid with year */}
          {profile?.keyAlbums && Array.isArray(profile.keyAlbums) && (profile.keyAlbums as any[]).length > 0 && (() => {
            const albums = (profile.keyAlbums as any[]).map((album: any) => {
              if (typeof album === "string") return { title: album };
              return album;
            });

            // Find cover images for each album from allEntities
            const albumCovers: Record<string, string> = {};
            for (const album of albums) {
              if (!album.title) continue;
              const albumSlug = album.title
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
              const albumSlugNoDash = albumSlug.replace(/-/g, "");
              for (const entId of Object.keys(allEntities || {})) {
                if (entId.startsWith("album_") && entId.includes(albumSlugNoDash)) {
                  const meta = allEntities?.[entId] as any;
                  if (meta?.image) {
                    albumCovers[album.title] = meta.image;
                    break;
                  }
                }
              }
            }

            return (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Klíčová alba
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {albums.slice(0, 4).map((album: any, i: number) => {
                    const cover = albumCovers[album.title];
                    const albumSlug = (album.title || "")
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "");

                    return (
                      <a
                        key={i}
                        href={`/alba/${albumSlug}`}
                        className="group block"
                      >
                        <div className="aspect-square rounded-sm overflow-hidden bg-white/[0.04] mb-2 relative">
                          {cover ? (
                            <img
                              src={cover}
                              alt={album.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-white/20 font-mono uppercase">
                              {album.year || "—"}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs font-semibold text-white truncate">
                          {album.title}
                        </div>
                        {album.year && (
                          <div className="text-[11px] font-mono text-white/40 mt-0.5">
                            {album.year}
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Key Tracks - interactive list with preview */}
          {profile?.keyTracks && Array.isArray(profile.keyTracks) && (profile.keyTracks as string[]).length > 0 && (() => {
            // Find artist albums from relations FIRST (před čtením z disku).
            // Původní kód četl tracks.json pro VŠECH 604 alb synchronně
            // (existsSync + readFileSync + JSON.parse) na každé artist stránce —
            // to byl bottleneck obřích stránek (Yzomandias 271 tracků) a příčina
            // build timeout/OOM. Teď čteme jen alba daného artisty. (11. 10. 2026)
            const artistId = id; // current entity id
            const relatedAlbums = (entity.outbound?.ALBUMS || []) as string[];
            const artistAlbums = relatedAlbums.length > 0
              ? relatedAlbums
              : Object.keys(allEntities || {}).filter((eid) => {
                  if (!eid.startsWith("album_")) return false;
                  const meta = allEntities?.[eid] as any;
                  return (meta?.outbound?.ARTISTS || []).includes(artistId);
                });

            // Read tracks.json only for this artist's albums.
            const trackPreviewMap: Record<string, { deezerId?: string; isrc?: string }> = {};
            for (const albumId of artistAlbums) {
              const tracksPath = join(process.cwd(), "content/entities", albumId, "tracks.json");
              if (!existsSync(tracksPath)) continue;
              let tracksData: any = null;
              try {
                tracksData = JSON.parse(readFileSync(tracksPath, "utf-8"));
              } catch {}
              if (!tracksData) continue;
              for (const t of (tracksData.tracks || [])) {
                const title = t.title_original || t.title;
                if (title) {
                  // Deezer track ID z linku — pro preview proxy (URL v datech
                  // expiruje, proto přehráváme přes /api/preview/{id}).
                  const dzId = String(t.link || "").match(/track\/(\d+)/)?.[1];
                  trackPreviewMap[title.toLowerCase()] = {
                    deezerId: dzId,
                    isrc: t.isrc,
                  };
                }
              }
            }

            return (
              <section>
                <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                  Klíčové tracky
                </h2>
                <ol className="space-y-1">
                  {(profile.keyTracks as string[]).slice(0, 6).map((trackTitle: string, i: number) => {
                    const track = trackPreviewMap[trackTitle.toLowerCase()];
                    return (
                      <li key={i} className="flex items-center gap-3 py-1.5 group">
                        <span className="text-[11px] font-mono text-white/30 w-5 tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm text-white/85 flex-1 truncate">
                          {trackTitle}
                        </span>
                        {track?.deezerId && <KeyTrackPlayer title={trackTitle} deezerId={track.deezerId} id={`${id}-${i}`} />}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })()}

          {/* Graph stats */}
          <section>
            <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
              V síti
            </h2>
            <p className="text-sm text-white/50">{totalConnections} vazeb · {inboundIds.length} odkazů</p>
          </section>

          {/* Relations */}
          {relations.length > 0 && (
            <section>
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40 mb-4">
                Vazby
              </h2>
              <div className="space-y-3">
                {relations.map(({ key, label, targets }) => (
                  <div key={key}>
                    <dt className="text-white/30 text-[11px] font-mono uppercase tracking-wide mb-1.5">
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

      {/* Nahlášení chyby / doplnění — jediná cesta, jak z webu dostat zpětnou vazbu */}
      <div className="mt-12 pt-8 border-t border-white/[0.06]">
        <FeedbackForm
          entityId={entity.id}
          entityTitle={entity.title}
          entityUrl={`${TYPE_ROUTE_MAP[entity.type as EntityType] ?? `/${entity.type}`}/${entity.slug}`}
        />
      </div>
    </main>
    </>
  );
}