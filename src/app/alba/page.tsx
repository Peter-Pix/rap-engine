import { Suspense } from 'react'
import { allAlbums, allRappers } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import { ListingHero, StatsBar } from '@/components/shared/ListingHero'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alba — Databáze české rapové scény',
  description:
    'Diskografie české a slovenské rapové scény. Klíčové LP, EP a mixtapy, žánry a labely.',
  alternates: { canonical: 'https://4rap.cz/alba' },
}

export default function AlbaPage() {
  const items = allAlbums
    .map((a) => {
      const rapper = allRappers.find((r) => r.slug === a.rapperSlug)
      return {
        slug: a.slug,
        title: a.title,
        description: a.description,
        url: a.url,
        meta: rapper?.title ? `${rapper.title} · ${a.year}` : String(a.year),
        tags: a.genre || [],
        featured: a.featured,
        genres: a.genre || [],
        year: a.year,
        rapperSlug: a.rapperSlug,
        publishedAt: a.publishedAt,
        releaseType: a.releaseType,
      }
    })

  const yearsCount = new Set(items.map((i) => i.year)).size
  const artistsCount = new Set(items.map((i) => i.rapperSlug)).size

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <ListingHero
        kicker="Diskografie"
        kickerColor="#60a5fa"
        title="Alba"
        description="Klíčové releases české a slovenské rap scény — recenze, kontext, žánrové zařazení a kreditní listy."
        meta={
          <StatsBar
            items={[
              { label: 'alb', value: items.length, color: '#60a5fa' },
              { label: 'rapperů', value: artistsCount, color: '#60a5fa' },
              { label: 'ročníků', value: yearsCount, color: '#60a5fa' },
            ]}
          />
        }
      />

      <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
        <FilterableListing
          items={items}
          itemType="album"
          filters={[
            { key: 'genres', label: 'Žánr', type: 'multi' },
            { key: 'releaseType', label: 'Typ', type: 'multi' },
            { key: 'year', label: 'Rok', type: 'year' },
          ]}
          availableSorts={['date', 'featured', 'alpha']}
          defaultSort="date"
        />
      </Suspense>
    </div>
  )
}
