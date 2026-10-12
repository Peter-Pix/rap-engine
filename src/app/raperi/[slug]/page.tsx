import type { Metadata } from "next";
import { EntityPage, generatePageMetadata, generatePageStaticParams } from "@/lib/content/page-helpers";

const TYPE = "artist";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generatePageMetadata(TYPE, slug) ?? {};
}

export function generateStaticParams() {
  return generatePageStaticParams(TYPE);
}

// Neexistující slug → 404 na úrovni routingu (spustí global-not-found
// s plným SSR HTML, místo prázdného NEXT_HTTP_ERROR_FALLBACK shellu).
export const dynamicParams = false;

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EntityPage type={TYPE} slug={slug} />;
}
