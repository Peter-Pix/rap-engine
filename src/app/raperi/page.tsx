import { Suspense } from 'react'
import { allRappers } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rappeři — Databáze české rapové scény',
  description: 'Kompletní databáze rapperů české a slovenské rap scény. Profily, diskografie, labely a žánrové zařazení.',
  alternates: { canonical: 'https://4rap.cz/raperi' },
}

export default function RaperiPage() {
  const items = allRappers.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description,
    url: r.url,
    meta: r.label,
    tags: r.genre || [],
    featured: r.featured,
    genres: r.genre || [],
    label: r.label,
    publishedAt: r.publishedAt,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#e4ff1a] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Rappeři</h1>
        <p className="text-zinc-400 text-sm">
          {items.length} profilů české a slovenské rapové scény
        </p>
      </div>

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
