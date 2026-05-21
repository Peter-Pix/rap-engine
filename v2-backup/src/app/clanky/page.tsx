import { allClaneks } from 'contentlayer/generated'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Články — Magazín české rapové scény',
  description: 'Recenze, profily, rozhovory a analýzy z české a slovenské rapové scény.',
  alternates: { canonical: 'https://4rap.cz/clanky' },
}

export default function ClankyPage() {
  const clanky = allClaneks.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-mono text-[#fb923c] uppercase tracking-widest mb-2">Magazín</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Články</h1>
        <p className="text-zinc-400 text-sm">{clanky.length} článků · recenze, profily, analýzy</p>
      </div>
      
      {clanky.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">Magazín se právě plní. První články jsou na cestě.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clanky.map((c) => (
            <EntityCard key={c.slug} title={c.title} description={c.description}
              href={c.url} type="clanek" meta={c.category} tags={c.tags} featured={c.featured} />
          ))}
        </div>
      )}
    </div>
  )
}
