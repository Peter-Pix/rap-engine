import { allZanrs } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { AggregationPage } from '@/components/entity/AggregationPage'
import { skladbyByZanr } from '@/lib/aggregations'
import type { Metadata } from 'next'

const BASE = 'https://4rap.cz'

export async function generateStaticParams() {
  return allZanrs.map((z) => ({ slug: z.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const zanr = allZanrs.find((z) => z.slug === slug)
  if (!zanr) return {}
  const tracks = skladbyByZanr(slug)
  return {
    title: `${zanr.title} skladby — Texty a kontext`,
    description: `${tracks.length} skladeb z žánru ${zanr.title}. Texty, kontext, analýza tracků české a slovenské scény.`,
    alternates: { canonical: `${BASE}/zanry/${slug}/skladby` },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const zanr = allZanrs.find((z) => z.slug === slug)
  if (!zanr) notFound()

  const tracks = skladbyByZanr(slug)

  return (
    <AggregationPage
      title={`${zanr.title} skladby`}
      subtitle={`${tracks.length} skladeb`}
      intro={`Skladby žánru ${zanr.title} — texty, kontext, analýza. Seřazeno od nejnovějšího.`}
      items={tracks.map((t) => ({
        slug: t.slug,
        title: t.title,
        description: t.description,
        url: t.url,
        canonicalUrl: t.canonicalUrl,
        meta: `${t.rapper}${t.year ? ` · ${t.year}` : ''}`,
        tags: t.genre,
      }))}
      itemType="skladba"
      breadcrumb={[
        { label: '4rap.cz', href: '/' },
        { label: 'Žánry', href: '/zanry' },
        { label: zanr.title, href: `/zanry/${slug}` },
        { label: 'Skladby' },
      ]}
      canonicalUrl={`${BASE}/zanry/${slug}/skladby`}
      schemaName={`${zanr.title} skladby — 4rap.cz`}
    />
  )
}
