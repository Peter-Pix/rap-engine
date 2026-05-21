import { allRappers, allAlbums } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildRapperMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import { EntityCard } from '@/components/entity/EntityCard'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allRappers.map((rapper) => ({ slug: rapper.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const rapper = allRappers.find((r) => r.slug === slug)
  if (!rapper) return {}
  return buildRapperMetadata(rapper)
}

export default async function RapperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const rapper = allRappers.find((r) => r.slug === slug)
  if (!rapper) notFound()

  const albums = allAlbums.filter((a) => a.rapperSlug === rapper.slug)
  const genres = rapper.genre || []

  // Schema.org bez labelSlug (není v Contentlayer fields)
  const rapperSchema = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: rapper.title,
    ...(rapper.realName && { alternateName: rapper.realName }),
    description: rapper.description,
    url: rapper.canonicalUrl,
    genre: genres,
    ...(rapper.label && { record: { '@type': 'MusicRecordLabel', name: rapper.label } }),
  }

  

  return (
    <>
      <JsonLd data={rapperSchema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <Breadcrumb items={[
          { label: '4rap.cz', href: '/' },
          { label: 'Rappeři', href: '/raperi' },
          { label: rapper.title },
        ]} currentUrl={rapper.canonicalUrl} />

        <div className="mt-8 grid lg:grid-cols-[1fr_320px] gap-12">
          <div>
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {genres.map((g) => (
                  <Link key={g} href={`/zanry/${g}`}
                    className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-sm bg-[#e4ff1a]/10 text-[#e4ff1a] border border-[#e4ff1a]/20 hover:bg-[#e4ff1a]/20 transition-colors">
                    {g}
                  </Link>
                ))}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-2">
                {rapper.title}
              </h1>
              {rapper.realName && (
                <p className="text-zinc-500 text-sm font-mono">{rapper.realName}</p>
              )}
            </div>
            <div className="rap-prose"><MDXRenderer code={rapper.body.code} /></div>
          </div>

          <aside className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">Info</h2>
              <dl className="space-y-3">
                {rapper.realName && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Občanské jméno</dt>
                    <dd className="text-sm text-zinc-200">{rapper.realName}</dd>
                  </div>
                )}
                {rapper.born && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Narozen</dt>
                    <dd className="text-sm text-zinc-200">{rapper.born}</dd>
                  </div>
                )}
                {rapper.active && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Aktivní</dt>
                    <dd className="text-sm text-zinc-200">{rapper.active}</dd>
                  </div>
                )}
                {rapper.label && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Label</dt>
                    <dd className="text-sm text-zinc-200">{rapper.label}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Diskografie</h2>
                {albums.length > 1 && (
                  <Link href={`/raperi/${rapper.slug}/alba`} className="text-[10px] font-mono text-[#60a5fa] hover:text-[#93c5fd] transition-colors">
                    Všechna →
                  </Link>
                )}
              </div>
              {albums.length > 0 ? (
                <div className="space-y-3">
                  {albums.slice(0, 3).map((album) => (
                    <EntityCard key={album.slug} title={album.title} description={album.description}
                      href={album.url} type="album" meta={String(album.year)} tags={album.genre || []} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">Žádná alba zatím nejsou v databázi.</p>
              )}
              <Link href={`/raperi/${rapper.slug}/skladby`} className="block mt-4 text-xs font-mono text-[#f472b6] hover:text-white transition-colors">
                Všechny skladby →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
