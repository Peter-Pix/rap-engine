import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveFromSlug, getRouteParamsForType } from "@/lib/content/route-resolver";
import { readEntityById, readInboundFor, readEntities } from "@/lib/content/cache-reader";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";
import { TrackDetail } from "@/components/content/track-detail";
import { getSimilarTracks } from "@/lib/content/graph-query";

const TYPE = "track";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = resolveFromSlug(TYPE, slug);
  if (!id) return {};
  const entity = readEntityById(id);
  if (!entity) return {};

  // Generované skladby bez obsahu (import z tracklistů) = noindex, follow.
  // Chrání před thin-content penalizací — tisíce holých stránek.
  const extraMeta = (entity as { extraMeta?: Record<string, unknown> }).extraMeta ?? {};
  const noindex =
    extraMeta.noindex === true ||
    extraMeta.isStub === true ||
    extraMeta.status === "draft";

  return {
    title: `${entity.title}`,
    description: entity.description || `Skladba ${entity.title} na 4rap.cz`,
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: `https://4rap.cz${TYPE_ROUTE_MAP.track}/${entity.slug}`,
    },
  };
}

export function generateStaticParams() {
  return getRouteParamsForType(TYPE).map(({ slug }) => ({ slug }));
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = resolveFromSlug(TYPE, slug);
  if (!id) notFound();

  const entity = readEntityById(id);
  if (!entity) notFound();

  const allEntities = readEntities();
  const inboundIds = readInboundFor(id);

  // Podobné skladby — z grafu (žánry/nálady/témata/interpret/album/label).
  // Track page tak přestává být slepá ulička.
  const similarTracks = getSimilarTracks(id, undefined, 0.08, 6).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    score: r.score,
  }));

  // Více od interpreta — další skladby hlavního interpreta (bez aktuální
  // a bez těch, co už jsou v "Podobné skladby"). Dodává track page další výstup.
  const primaryArtistId = (entity.outbound?.HAS_ARTIST ?? [])[0];
  const similarIds = new Set(similarTracks.map((t) => t.id));
  const moreFromArtist = primaryArtistId
    ? Object.values(allEntities ?? {})
        .filter(
          (e) =>
            e.type === "track" &&
            e.id !== id &&
            !similarIds.has(e.id) &&
            (e.outbound?.HAS_ARTIST ?? []).includes(primaryArtistId),
        )
        .slice(0, 6)
        .map((e) => ({ id: e.id, slug: e.slug, title: e.title }))
    : [];

  // Build entity index for resolving relations
  const entityIndex: Record<string, { id: string; type: string; slug: string; title: string; image?: string | null }> = {};
  if (allEntities) {
    for (const [eid, e] of Object.entries(allEntities)) {
      entityIndex[eid] = {
        id: eid,
        type: e.type,
        slug: e.slug,
        title: e.title,
        image: e.image ?? null,
      };
    }
  }

  return (
    <TrackDetail
      entity={{
        id: entity.id,
        slug: entity.slug,
        title: entity.title,
        description: entity.description,
        image: entity.image ?? null,
        publishedAt: entity.publishedAt,
        content: (entity as any).content,
        outbound: entity.outbound as Record<string, string[]> | undefined,
        profile: (entity.extraMeta as Record<string, unknown>) ?? null,
      }}
      allEntities={entityIndex}
      inboundIds={inboundIds}
      similarTracks={similarTracks}
      moreFromArtist={moreFromArtist}
    />
  );
}
