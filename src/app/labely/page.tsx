import { Suspense } from 'react'
import { allLabels, allRappers, allAlbums } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import { ListingHero, StatsBar } from '@/components/shared/ListingHero'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Labely — Databáze české rapové scény',
  description:
    'Hudební vydavatelství české rapové scény. Roster, releases, zakladatelé a éry.',
  alternates: { canonical: 'https://4rap.cz/labely' },
}

export default function LabelyPage() {
  const items = allLabels.map((l) => {
    const rosterCount = allRappers.filter((r) => r.label === l.title).length
    const releasesCount = allAlbums.filter((a) => a.labelSlug === l.slug).length
    return {
      slug: l.slug,
      title: l.title,
      description: l.description,
      url: l.url,
      meta: rosterCount > 0 ? `${rosterCount} rapperů · ${releasesCount} releases` : undefined,
      tags: l.location ? [l.location] : [],
      featured: 'featured' in l ? (l as any).featured : undefined,
      location: l.location,
      publishedAt: l.publishedAt,
    }
  })

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <ListingHero
        kicker="Vydavatelství"
        kickerColor="#a78bfa"
        title="Labely"
        description="Labelová architektura české rap scény — kdo vydává, kdo formuje zvuk, kdo definoval éry."
        meta={
          <StatsBar
            items={[
              { label: 'labelů', value: items.length, color: '#a78bfa' },
              { label: 'rapperů celkem', value: allRappers.length, color: '#a78bfa' },
              { label: 'releases', value: allAlbums.length, color: '#a78bfa' },
            ]}
          />
        }
      />

      <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
        <FilterableListing
          items={items}
          itemType="label"
          filters={[{ key: 'location', label: 'Lokalita', type: 'multi' }]}
          availableSorts={['alpha', 'featured']}
          defaultSort="alpha"
        />
      </Suspense>
    </div>
  )
}
