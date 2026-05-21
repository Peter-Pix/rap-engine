import { Suspense } from 'react'
import { allSkladbas } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Skladby — Databáze textů a tracků české rapové scény',
  description: 'Databáze skladeb české a slovenské rap scény. Texty, kontext, analýza — vše propojeno s rappery a alby.',
  alternates: { canonical: 'https://4rap.cz/skladby' },
}

export default function SkladbyPage() {
  const items = allSkladbas.map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description,
    url: s.url,
    meta: `${s.rapper}${s.album ? ` · ${s.album}` : ''}${s.year ? ` · ${s.year}` : ''}`,
    tags: s.genre || [],
    genres: s.genre || [],
    rapper: s.rapper,
    rapperSlug: s.rapperSlug,
    album: s.album,
    albumSlug: s.albumSlug,
    year: s.year,
    publishedAt: s.publishedAt,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#f472b6] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Skladby</h1>
        <p className="text-zinc-400 text-sm">{items.length} skladeb — texty, kontext, analýza</p>
      </div>
      {items.length > 0 ? (
        <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
          <FilterableListing
            items={items}
            itemType="skladba"
            filters={[
              { key: 'genres', label: 'Žánr', type: 'multi' },
              { key: 'rapper', label: 'Rapper', type: 'multi' },
              { key: 'album', label: 'Album', type: 'multi' },
              { key: 'year', label: 'Rok', type: 'year' },
            ]}
            availableSorts={['year', 'alpha', 'date']}
            defaultSort="year"
          />
        </Suspense>
      ) : (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">Databáze skladeb se právě plní.</p>
        </div>
      )}
    </div>
  )
}
