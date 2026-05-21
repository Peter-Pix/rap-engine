import { Suspense } from 'react'
import { allLabels } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Labely — Vydavatelství české rapové scény',
  description: 'Databáze nezávislých i major labelů české a slovenské rap scény.',
  alternates: { canonical: 'https://4rap.cz/labely' },
}

export default function LabelyPage() {
  const items = allLabels.map((l) => ({
    slug: l.slug,
    title: l.title,
    description: l.description,
    url: l.url,
    meta: l.founded,
    tags: l.artists?.slice(0, 3),
    location: l.location,
    publishedAt: l.publishedAt,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#a78bfa] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Labely</h1>
        <p className="text-zinc-400 text-sm">{items.length} vydavatelství</p>
      </div>
      <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
        <FilterableListing
          items={items}
          itemType="label"
          filters={[{ key: 'location', label: 'Lokalita', type: 'multi' }]}
          availableSorts={['alpha', 'date']}
          defaultSort="alpha"
        />
      </Suspense>
    </div>
  )
}
