import { allZanrs } from 'contentlayer/generated'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Žánry — Průvodce zvuky české rapové scény',
  description: 'Průvodce žánry a subžánry české rap scény — od boom bapu přes drill po UK garage.',
  alternates: { canonical: 'https://4rap.cz/zanry' },
}
export default function ZanryPage() {
  const zanry = allZanrs.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-mono text-[#34d399] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Žánry</h1>
        <p className="text-zinc-400 text-sm">{zanry.length} žánrů a subžánrů</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {zanry.map((z) => (
          <EntityCard key={z.slug} title={z.title} description={z.description} href={z.url} type="zanr" meta={z.origin} />
        ))}
      </div>
    </div>
  )
}
