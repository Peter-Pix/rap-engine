import { allLabels } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { AggregationPage } from '@/components/entity/AggregationPage'
import { albumsByLabel } from '@/lib/aggregations'
import type { Metadata } from 'next'

const BASE = 'https://4rap.cz'

export async function generateStaticParams() {
  return allLabels.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const label = allLabels.find((l) => l.slug === slug)
  if (!label) return {}
  const albums = albumsByLabel(slug)
  return {
    title: `${label.title} alba — Katalog labelu`,
    description: `${albums.length} alb vydaných pod labelem ${label.title}. Kompletní vydavatelský katalog.`,
    alternates: { canonical: `${BASE}/labely/${slug}/alba` },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const label = allLabels.find((l) => l.slug === slug)
  if (!label) notFound()

  const albums = albumsByLabel(slug)

  return (
    <AggregationPage
      title={`${label.title} alba`}
      subtitle={`${albums.length} alb v katalogu`}
      intro={`Kompletní katalog alb vydaných pod labelem ${label.title}. Seřazeno od nejnovějšího.`}
      items={albums.map((a) => ({
        slug: a.slug,
        title: a.title,
        description: a.description,
        url: a.url,
        canonicalUrl: a.canonicalUrl,
        meta: `${a.rapper} · ${a.year}`,
        tags: a.genre,
      }))}
      itemType="album"
      breadcrumb={[
        { label: '4rap.cz', href: '/' },
        { label: 'Labely', href: '/labely' },
        { label: label.title, href: `/labely/${slug}` },
        { label: 'Alba' },
      ]}
      canonicalUrl={`${BASE}/labely/${slug}/alba`}
      schemaName={`${label.title} katalog — 4rap.cz`}
    />
  )
}
