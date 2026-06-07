import { allLabels } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { AggregationPage } from '@/components/entity/AggregationPage'
import { rappersByLabel } from '@/lib/aggregations'
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
  const rappers = rappersByLabel(slug)
  return {
    title: `${label.title} rappeři — Roster labelu`,
    description: `${rappers.length} rapperů na labelu ${label.title}. Aktuální i historický roster, profily, diskografie.`,
    alternates: { canonical: `${BASE}/labely/${slug}/raperi` },
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

  const rappers = rappersByLabel(slug)

  return (
    <AggregationPage
      title={`${label.title} rappeři`}
      subtitle={`${rappers.length} umělců na labelu`}
      intro={`Aktuální i historický roster labelu ${label.title}. ${label.founded ? `Label aktivní od ${label.founded}. ` : ''}Profily rapperů, diskografie a žánrové zařazení.`}
      items={rappers.map((r) => ({
        slug: r.slug,
        title: r.title,
        description: r.description ?? '',
        url: r.url,
        canonicalUrl: r.canonicalUrl,
        meta: r.active,
        tags: r.genre,
      }))}
      itemType="rapper"
      breadcrumb={[
        { label: '4rap.cz', href: '/' },
        { label: 'Labely', href: '/labely' },
        { label: label.title, href: `/labely/${slug}` },
        { label: 'Rappeři' },
      ]}
      canonicalUrl={`${BASE}/labely/${slug}/raperi`}
      schemaName={`${label.title} roster — 4rap.cz`}
    />
  )
}
