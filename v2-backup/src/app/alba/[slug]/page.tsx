import { allAlbums, allRappers } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildAlbumMetadata } from '@/lib/metadata'
import { getAlbumSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import { EntityCard } from '@/components/entity/EntityCard'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allAlbums.map((album) => ({ slug: album.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const album = allAlbums.find((a) => a.slug === slug)
  if (!album) return {}
  return buildAlbumMetadata(album)
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const album = allAlbums.find((a) => a.slug === slug)
  if (!album) notFound()

  const rapper = allRappers.find((r) => r.slug === album.rapperSlug)
  const albumSchema = getAlbumSchema({
    slug: album.slug, title: album.title, rapper: album.rapper, rapperSlug: album.rapperSlug,
    label: album.label, labelSlug: album.labelSlug, year: album.year, genre: album.genre || [],
    description: album.description, image: album.image, tracklist: album.tracklist || [],
    rating: album.rating, publishedAt: album.publishedAt, url: album.url, canonicalUrl: album.canonicalUrl,
  })
  

  return (
    <>
      <JsonLd data={albumSchema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <Breadcrumb items={[
          { label: '4rap.cz', href: '/' },
          { label: 'Alba', href: '/alba' },
          { label: album.title },
        ]} currentUrl={album.canonicalUrl} />
        <div className="mt-8 grid lg:grid-cols-[1fr_300px] gap-12">
          <div>
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {album.genre?.map((g) => (
                  <Link key={g} href={`/zanry/${g}`} className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-sm bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20 hover:bg-[#60a5fa]/20 transition-colors">{g}</Link>
                ))}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-2">{album.title}</h1>
              <Link href={`/raperi/${album.rapperSlug}`} className="text-zinc-400 hover:text-[#e4ff1a] transition-colors font-medium">{album.rapper}</Link>
              <span className="text-zinc-600 mx-2">·</span>
              <span className="text-zinc-500">{album.year}</span>
            </div>
            <div className="rap-prose"><MDXRenderer code={album.body.code} /></div>
          </div>
          <aside className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">Info</h2>
              <dl className="space-y-3">
                <div><dt className="text-xs text-zinc-600 mb-0.5">Rapper</dt>
                  <dd><Link href={`/raperi/${album.rapperSlug}`} className="text-sm text-[#e4ff1a] hover:text-white transition-colors">{album.rapper}</Link></dd>
                </div>
                <div><dt className="text-xs text-zinc-600 mb-0.5">Rok</dt><dd className="text-sm text-zinc-200">{album.year}</dd></div>
                {album.label && <div><dt className="text-xs text-zinc-600 mb-0.5">Label</dt>
                  <dd className="text-sm">{album.labelSlug ? <Link href={`/labely/${album.labelSlug}`} className="text-[#a78bfa] hover:text-[#c4b5fd] transition-colors">{album.label}</Link> : <span className="text-zinc-200">{album.label}</span>}</dd>
                </div>}
                {album.rating && <div><dt className="text-xs text-zinc-600 mb-0.5">Hodnocení</dt>
                  <dd className="text-lg font-black text-[#e4ff1a]">{album.rating}<span className="text-xs text-zinc-600 font-normal">/10</span></dd>
                </div>}
              </dl>
            </div>
            {album.tracklist && album.tracklist.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">Tracklist</h2>
                <ol className="space-y-1.5">
                  {album.tracklist.map((track, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-xs font-mono text-zinc-700 w-4 text-right">{i + 1}</span>
                      <span className="text-zinc-300">{track}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {rapper && (
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-3">Rapper</h2>
                <EntityCard title={rapper.title} description={rapper.description} href={rapper.url} type="rapper" meta={rapper.label} tags={rapper.genre} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
