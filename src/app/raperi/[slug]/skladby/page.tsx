import { allRappers } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { AggregationPage } from '@/components/entity/AggregationPage'
import { skladbyByRapper } from '@/lib/aggregations'
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
  const tracks = skladbyByRapper(slug)
  return {
    title: `${rapper.title} skladby — Texty a tracky`,
    description: `${tracks.length} skladeb od ${rapper.title} včetně feat. spoluprací. Texty, kontext, analýza.`,
    alternates: { canonical: `${BASE}/raperi/${slug}/skladby` },
    robots: { index: false },
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

  const tracks = skladbyByRapper(slug)
  const primaryCount = tracks.filter((t) => t.rapperSlug === slug).length
  const featCount = tracks.length - primaryCount

  return (
    <AggregationPage
      title={`${rapper.title} — Skladby`}
      subtitle={
        featCount > 0
          ? `${primaryCount} primárních + ${featCount} feat. spoluprací`
          : `${primaryCount} skladeb`
      }
      intro={`Všechny skladby rappera ${rapper.title} — jako primární umělec i v rámci feat. spoluprací. Texty, kontext, analýza.`}
      items={tracks.map((t) => ({
        slug: t.slug,
        title: t.title,
        description: t.description,
        url: t.url,
        canonicalUrl: t.canonicalUrl,
        meta:
          t.rapperSlug === slug
            ? `${t.album || ''}${t.year ? ` · ${t.year}` : ''}`
            : `feat. (primary: ${t.rapper})`,
        tags: t.genre,
      }))}
      itemType="skladba"
      breadcrumb={[
        { label: '4rap.cz', href: '/' },
        { label: 'Rappeři', href: '/raperi' },
        { label: rapper.title, href: `/raperi/${slug}` },
        { label: 'Skladby' },
      ]}
      canonicalUrl={`${BASE}/raperi/${slug}/skladby`}
      schemaName={`${rapper.title} skladby — 4rap.cz`}
    />
  )
}
