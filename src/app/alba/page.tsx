import { Suspense } from 'react'
import { allAlbums } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alba — Diskografie české rapové scény',
  description: 'Recenzovaná diskografie české a slovenské rap scény. Kompletní databáze alb s hodnoceními, tracklisty a kontextem.',
  alternates: { canonical: 'https://4rap.cz/alba' },
}

export default function AlbaPage() {
  const items = allAlbums.map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    url: a.url,
    meta: `${a.rapper} · ${a.year}`,
    tags: a.genre || [],
    genres: a.genre || [],
    label: a.label,
    rapper: a.rapper,
    rapperSlug: a.rapperSlug,
    year: a.year,
    publishedAt: a.publishedAt,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#60a5fa] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Alba</h1>
        <p className="text-zinc-400 text-sm">{items.length} alb v diskografii</p>
      </div>
      <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
        <FilterableListing
          items={items}
          itemType="album"
          filters={[
            { key: 'genres', label: 'Žánr', type: 'multi' },
            { key: 'rapper', label: 'Rapper', type: 'multi' },
            { key: 'label', label: 'Label', type: 'multi' },
            { key: 'year', label: 'Rok', type: 'year' },
          ]}
          availableSorts={['year', 'alpha', 'date']}
          defaultSort="year"
        />
      </Suspense>
    </div>
  )
}
