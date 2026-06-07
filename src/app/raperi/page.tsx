import { Suspense } from 'react'
import { allRappers } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import { ListingHero, StatsBar } from '@/components/shared/ListingHero'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rappeři — Databáze české rapové scény',
  description:
    'Kompletní databáze rapperů české a slovenské rap scény. Profily, diskografie, labely a žánrové zařazení.',
  alternates: { canonical: 'https://4rap.cz/raperi' },
}

export default function RaperiPage() {
  const items = allRappers.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description ?? '',
    url: r.url,
    meta: r.label,
    tags: r.genre || [],
    ffeatured: 'featured' in r ? (r as any).featured : undefined,
    genres: r.genre || [],
    label: r.label,
    publishedAt: r.publishedAt,
  }))

  // Unique counts pro stats
  const labelsCount = new Set(items.map((i) => i.label).filter(Boolean)).size
  const genresCount = new Set(items.flatMap((i) => i.genres)).size

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <ListingHero
        kicker="Databáze"
        title="Rappeři"
        description="Profily české a slovenské rapové scény — od pionýrů PSH éry po současnou Milion+ generaci."
        meta={
          <StatsBar
            items={[
              { label: 'profilů', value: items.length },
              { label: 'labelů', value: labelsCount },
              { label: 'žánrů', value: genresCount },
            ]}
          />
        }
      />

      <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
        <FilterableListing
          items={items}
          itemType="rapper"
          filters={[
            { key: 'genres', label: 'Žánr', type: 'multi' },
            { key: 'label', label: 'Label', type: 'multi' },
          ]}
          availableSorts={['alpha', 'featured', 'date']}
          defaultSort="alpha"
        />
      </Suspense>
    </div>
  )
}
