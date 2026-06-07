import { allZanrs } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { AggregationPage } from '@/components/entity/AggregationPage'
import { rappersByZanr } from '@/lib/aggregations'
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
  const rappers = rappersByZanr(slug)
  return {
    title: `${zanr.title} rappeři — Kompletní seznam`,
    description: `Kompletní seznam ${rappers.length} rapperů z žánru ${zanr.title} na české a slovenské scéně. Profily, alba, labely.`,
    alternates: { canonical: `${BASE}/zanry/${slug}/raperi` },
    openGraph: {
      title: `${zanr.title} rappeři | 4rap.cz`,
      description: `${rappers.length} rapperů žánru ${zanr.title}`,
      type: 'website',
    },
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

  const rappers = rappersByZanr(slug)

  return (
    <AggregationPage
      title={`${zanr.title} rappeři`}
      subtitle={`${rappers.length} rapperů v této kategorii`}
      intro={`Kompletní přehled rapperů z žánru ${zanr.title} na české a slovenské scéně. Seřazeno abecedně. Klikni pro profil, diskografii a žánrové zařazení.`}
      items={rappers.map((r) => ({
        slug: r.slug,
        title: r.title,
        description: r.description ?? '',
        url: r.url,
        canonicalUrl: r.canonicalUrl,
        meta: r.label,
        tags: r.genre,
      }))}
      itemType="rapper"
      breadcrumb={[
        { label: '4rap.cz', href: '/' },
        { label: 'Žánry', href: '/zanry' },
        { label: zanr.title, href: `/zanry/${slug}` },
        { label: 'Rappeři' },
      ]}
      canonicalUrl={`${BASE}/zanry/${slug}/raperi`}
      schemaName={`${zanr.title} rappeři — 4rap.cz`}
    />
  )
}
