import { Suspense } from 'react'
import { allSkladbas, allRappers } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import { ListingHero, StatsBar } from '@/components/shared/ListingHero'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Skladby — Databáze české rapové scény',
  description:
    'Klíčové tracky české a slovenské rap scény. Producenti, sample, kontext a kreditní listy.',
  alternates: { canonical: 'https://4rap.cz/skladby' },
}

export default function SkladbyPage() {
  const items = allSkladbas.map((s) => {
    const rapper = allRappers.find((r) => r.slug === s.rapperSlug)
    return {
      slug: s.slug,
      title: s.title,
      description: s.description,
      url: s.url,
      meta: rapper?.title ? `${rapper.title}${s.year ? ` · ${s.year}` : ''}` : undefined,
      tags: s.genre || [],
      ffeatured: 'featured' in s ? (s as any).featured : undefined,
      genres: s.genre || [],
      year: s.year,
      rapperSlug: s.rapperSlug,
      publishedAt: s.publishedAt,
    }
  })

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <ListingHero
        kicker="Hudba"
        kickerColor="#f472b6"
        title="Skladby"
        description="Klíčové tracky, diss tracky, kolaborace a milníky scény — s producenty, sampley a kreditním zázemím."
        meta={
          <StatsBar
            items={[
              { label: 'skladeb', value: items.length, color: '#f472b6' },
              { label: 'rapperů', value: new Set(items.map((i) => i.rapperSlug)).size, color: '#f472b6' },
            ]}
          />
        }
      />

      <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
        <FilterableListing
          items={items}
          itemType="skladba"
          filters={[
            { key: 'genres', label: 'Žánr', type: 'multi' },
            { key: 'year', label: 'Rok', type: 'year' },
          ]}
          availableSorts={['date', 'featured', 'alpha']}
          defaultSort="date"
        />
      </Suspense>
    </div>
  )
}
