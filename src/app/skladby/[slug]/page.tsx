import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveFromSlug, getRouteParamsForType } from "@/lib/content/route-resolver";
import { readEntityById, readInboundFor, readEntities } from "@/lib/content/cache-reader";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";
import { TrackDetail } from "@/components/content/track-detail";

const TYPE = "track";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = resolveFromSlug(TYPE, slug);
  if (!id) return {};
  const entity = readEntityById(id);
  if (!entity) return {};

  return {
    title: `${entity.title} | 4rap.cz`,
    description: entity.description || `Skladba ${entity.title} na 4rap.cz`,
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

  // Build entity index for resolving relations
  const entityIndex: Record<string, { id: string; type: string; slug: string; title: string }> = {};
  if (allEntities) {
    for (const [eid, e] of Object.entries(allEntities)) {
      entityIndex[eid] = {
        id: eid,
        type: e.type,
        slug: e.slug,
        title: e.title,
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
    />
  );
}
