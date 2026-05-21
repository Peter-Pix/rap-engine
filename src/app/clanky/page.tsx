import { Suspense } from 'react'
import { allClaneks } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Články — Magazín české rapové scény',
  description: 'Recenze, profily, rozhovory a analýzy z české a slovenské rapové scény.',
  alternates: { canonical: 'https://4rap.cz/clanky' },
}

export default function ClankyPage() {
  const items = allClaneks.map((c) => ({
    slug: c.slug,
    title: c.title,
    description: c.description,
    url: c.url,
    meta: c.category,
    tags: c.tags,
    featured: c.featured,
    category: c.category,
    publishedAt: c.publishedAt,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#fb923c] uppercase tracking-widest mb-2">Magazín</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Články</h1>
        <p className="text-zinc-400 text-sm">{items.length} článků</p>
      </div>
      {items.length > 0 ? (
        <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
          <FilterableListing
            items={items}
            itemType="clanek"
            filters={[{ key: 'category', label: 'Kategorie', type: 'multi' }]}
            availableSorts={['date', 'alpha', 'featured']}
            defaultSort="date"
          />
        </Suspense>
      ) : (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">Magazín se právě plní.</p>
        </div>
      )}
    </div>
  )
}
