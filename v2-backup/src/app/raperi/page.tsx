import { allRappers } from 'contentlayer/generated'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rappeři — Databáze české rapové scény',
  description: 'Kompletní databáze rapperů české a slovenské rap scény. Profily, diskografie, labely a žánrové zařazení.',
  alternates: { canonical: 'https://4rap.cz/raperi' },
}

export default function RaperiPage() {
  const rappers = allRappers.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-mono text-[#e4ff1a] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Rappeři</h1>
        <p className="text-zinc-400 text-sm">
          {rappers.length} profilů · každý automaticky propojený s alby, labely a žánry
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rappers.map((rapper) => (
          <EntityCard
            key={rapper.slug}
            title={rapper.title}
            description={rapper.description}
            href={rapper.url}
            type="rapper"
            meta={rapper.label}
            tags={rapper.genre}
            featured={rapper.featured}
          />
        ))}
      </div>
    </div>
  )
}
