import { allZanrs } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { AggregationPage } from '@/components/entity/AggregationPage'
import { albumsByZanr } from '@/lib/aggregations'
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
  const albums = albumsByZanr(slug)
  return {
    title: `${zanr.title} alba — Diskografie`,
    description: `${albums.length} alb z žánru ${zanr.title} na české a slovenské rapové scéně. Recenze, hodnocení, tracklisty.`,
    alternates: { canonical: `${BASE}/zanry/${slug}/alba` },
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

  const albums = albumsByZanr(slug)

  return (
    <AggregationPage
      title={`${zanr.title} alba`}
      subtitle={`${albums.length} alb v této kategorii`}
      intro={`Kompletní diskografie alb žánru ${zanr.title} na české a slovenské scéně. Seřazeno od nejnovějšího.`}
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
        { label: 'Žánry', href: '/zanry' },
        { label: zanr.title, href: `/zanry/${slug}` },
        { label: 'Alba' },
      ]}
      canonicalUrl={`${BASE}/zanry/${slug}/alba`}
      schemaName={`${zanr.title} alba — 4rap.cz`}
    />
  )
}
