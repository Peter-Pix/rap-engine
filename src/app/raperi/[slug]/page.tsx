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

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EntityPage type={TYPE} slug={slug} />;
}
