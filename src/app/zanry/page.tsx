import { Suspense } from 'react'
import { allZanrs } from 'contentlayer/generated'
import { FilterableListing } from '@/components/entity/FilterableListing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Žánry — Průvodce zvuky české rapové scény',
  description: 'Průvodce žánry a subžánry české rap scény — od boom bapu přes drill po UK garage.',
  alternates: { canonical: 'https://4rap.cz/zanry' },
}

export default function ZanryPage() {
  const items = allZanrs.map((z) => ({
    slug: z.slug,
    title: z.title,
    description: z.description,
    url: z.url,
    meta: z.origin,
    publishedAt: z.publishedAt,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <p className="text-xs font-mono text-[#34d399] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Žánry</h1>
        <p className="text-zinc-400 text-sm">{items.length} žánrů a subžánrů</p>
      </div>
      <Suspense fallback={<div className="text-zinc-500 text-sm">Načítám…</div>}>
        <FilterableListing
          items={items}
          itemType="zanr"
          filters={[]}
          availableSorts={['alpha', 'date']}
          defaultSort="alpha"
        />
      </Suspense>
    </div>
  )
}
