import { Suspense } from 'react'
import { SearchResults } from '@/components/search/SearchResults'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hledat',
  description: 'Fulltext search napříč databází české rapové scény — rappeři, alba, labely, žánry, skladby a články.',
  alternates: { canonical: 'https://4rap.cz/hledej' },
  robots: {
    // Search výsledky neindexovat (filtered views nemají SEO hodnotu)
    index: false,
    follow: true,
  },
}

export default function HledejPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <Breadcrumb
        items={[
          { label: '4rap.cz', href: '/' },
          { label: 'Hledat' },
        ]}
      />
      <div className="mt-8 mb-6">
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Search</p>
        <h1 className="text-4xl font-black text-white tracking-tight">Hledat</h1>
      </div>
      <Suspense
        fallback={<div className="text-center py-16 text-zinc-500">Načítám…</div>}
      >
        <SearchResults />
      </Suspense>
    </div>
  )
}
