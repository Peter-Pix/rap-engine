import { allLabels } from 'contentlayer/generated'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Labely — Vydavatelství české rapové scény',
  description: 'Databáze nezávislých i major labelů české a slovenské rap scény.',
  alternates: { canonical: 'https://4rap.cz/labely' },
}
export default function LabelyPage() {
  const labels = allLabels.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-mono text-[#a78bfa] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Labely</h1>
        <p className="text-zinc-400 text-sm">{labels.length} vydavatelství</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {labels.map((label) => (
          <EntityCard key={label.slug} title={label.title} description={label.description}
            href={label.url} type="label" meta={label.founded} tags={label.artists?.slice(0,3)} />
        ))}
      </div>
    </div>
  )
}
