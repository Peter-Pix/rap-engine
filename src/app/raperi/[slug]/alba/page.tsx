import { allRappers } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { AggregationPage } from '@/components/entity/AggregationPage'
import { albumsByRapper } from '@/lib/aggregations'
import type { Metadata } from 'next'

const BASE = 'https://4rap.cz'

export async function generateStaticParams() {
  return allRappers.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const rapper = allRappers.find((r) => r.slug === slug)
  if (!rapper) return {}
  const albums = albumsByRapper(slug)
  return {
    title: `${rapper.title} alba — Diskografie`,
    description: `Kompletní diskografie rappera ${rapper.title} — ${albums.length} alb a EP. Recenze, hodnocení.`,
    alternates: { canonical: `${BASE}/raperi/${slug}/alba` },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const rapper = allRappers.find((r) => r.slug === slug)
  if (!rapper) notFound()

  const albums = albumsByRapper(slug)

  return (
    <AggregationPage
      title={`${rapper.title} — Diskografie`}
      subtitle={`${albums.length} alb a EP`}
      intro={`Kompletní diskografie rappera ${rapper.title}. Seřazeno od nejnovějšího. Recenze, hodnocení, tracklisty.`}
      items={albums.map((a) => ({
        slug: a.slug,
        title: a.title,
        description: a.description,
        url: a.url,
        canonicalUrl: a.canonicalUrl,
        meta: String(a.year),
        tags: a.genre,
      }))}
      itemType="album"
      breadcrumb={[
        { label: '4rap.cz', href: '/' },
        { label: 'Rappeři', href: '/raperi' },
        { label: rapper.title, href: `/raperi/${slug}` },
        { label: 'Alba' },
      ]}
      canonicalUrl={`${BASE}/raperi/${slug}/alba`}
      schemaName={`${rapper.title} diskografie — 4rap.cz`}
    />
  )
}
