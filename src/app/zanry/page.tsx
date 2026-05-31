import { Suspense } from 'react'
import { allZanrs, allRappers, allAlbums } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import { ListingHero, StatsBar } from '@/components/shared/ListingHero'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Žánry — Databáze české rapové scény',
  description:
    'Žánrová mapa českého rapu — trap, drill, grime, boom bap a další směry. Charakteristiky, klíčoví umělci a historie.',
  alternates: { canonical: 'https://4rap.cz/zanry' },
}

export default function ZanryPage() {
  const items = allZanrs.map((z) => {
    const rappersCount = allRappers.filter((r) => r.genre?.includes(z.slug)).length
    const albumsCount = allAlbums.filter((a) => a.genre?.includes(z.slug)).length
    return {
      slug: z.slug,
      title: z.title,
      description: z.description,
      url: z.url,
      meta: rappersCount > 0 ? `${rappersCount} rapperů · ${albumsCount} alb` : undefined,
      tags: z.origin ? [z.origin] : [],
      featured: z.featured,
      origin: z.origin,
      publishedAt: z.publishedAt,
    }
  })

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <ListingHero
        kicker="Žánrová mapa"
        kickerColor="#34d399"
        title="Žánry"
        description="Od raných boom-bap kořenů po současný trap, drill a grime — žánrová architektura české rap scény."
        meta={
          <StatsBar
            items={[
              { label: 'žánrů', value: items.length, color: '#34d399' },
              { label: 'rapperů zařazeno', value: allRappers.length, color: '#34d399' },
            ]}
          />
        }
      />

      <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
        <FilterableListing
          items={items}
          itemType="zanr"
          filters={[{ key: 'origin', label: 'Původ', type: 'multi' }]}
          availableSorts={['alpha', 'featured']}
          defaultSort="alpha"
        />
      </Suspense>
    </div>
  )
}
