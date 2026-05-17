import { allAlbums } from 'contentlayer/generated'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alba — Diskografie české rapové scény',
  description: 'Recenzovaná diskografie české a slovenské rap scény. Kompletní databáze alb s hodnoceními, tracklistry a kontextem.',
  alternates: { canonical: 'https://4rap.cz/alba' },
}

export default function AlbaPage() {
  const albums = allAlbums.sort((a, b) => b.year - a.year)
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-mono text-[#60a5fa] uppercase tracking-widest mb-2">Databáze</p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Alba</h1>
        <p className="text-zinc-400 text-sm">{albums.length} alb · seřazeno dle roku vydání</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {albums.map((album) => (
          <EntityCard key={album.slug} title={album.title} description={album.description}
            href={album.url} type="album" meta={`${album.rapper} · ${album.year}`} tags={album.genre} />
        ))}
      </div>
    </div>
  )
}
