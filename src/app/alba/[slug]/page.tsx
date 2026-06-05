import { allAlbums, allRappers, allLabels } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildAlbumMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { DetailHero, DetailLayout, SidebarCard, InfoDl } from '@/components/shared/DetailHero'
import { EntityCard, EntityChip } from '@/components/shared/EntityCard'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allAlbums.map((a) => ({ slug: a.slug }))
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
  const label = album.labelSlug ? allLabels.find((l) => l.slug === album.labelSlug) : null
  const genres = album.genre || []

  // Related: další alba od stejného rappera
  const moreFromArtist = allAlbums
    .filter((a) => a.rapperSlug === album.rapperSlug && a.slug !== album.slug)
    .sort((a, b) => b.year - a.year)
    .slice(0, 4)

  const albumSchema = {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: album.title,
    description: album.description,
    url: album.canonicalUrl,
    datePublished: String(album.year),
    genre: genres,
    ...(rapper && { byArtist: { '@type': 'MusicGroup', name: rapper.title, url: rapper.canonicalUrl } }),
    ...(label && { recordLabel: { '@type': 'MusicRecordLabel', name: label.title } }),
  }

  return (
    <>
      <JsonLd data={albumSchema} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <DetailHero
          type="album"
          typeLabel={album.type ? album.type.toUpperCase() : 'ALBUM'}
          breadcrumbs={[
            { label: '4rap.cz', href: '/' },
            { label: 'Alba', href: '/alba' },
            { label: album.title },
          ]}
          title={album.title}
          subtitle={rapper?.title}
          description={album.description}
          chips={
            <>
              <EntityChip type="album" label={String(album.year)} />
              {rapper && (
                <EntityChip type="rapper" label={rapper.title} href={rapper.url} />
              )}
              {label && (
                <EntityChip type="label" label={label.title} href={label.url} />
              )}
              {genres.map((g) => (
                <EntityChip key={g} type="zanr" label={g} href={`/zanry/${g}`} />
              ))}
            </>
          }
        />

        <DetailLayout
          sidebar={
            <>
              <SidebarCard title="Info">
                <InfoDl
                  items={[
                    { label: 'Rok', value: album.year },
                    { label: 'Typ', value: album.type?.toUpperCase() },
                    { label: 'Rapper', value: rapper && (
                      <Link href={rapper.url} className="text-[#e4ff1a] hover:brightness-125 transition-all">
                        {rapper.title}
                      </Link>
                    )},
                    { label: 'Label', value: label && (
                      <Link href={label.url} className="text-violet-300 hover:text-violet-200 transition-colors">
                        {label.title}
                      </Link>
                    )},
                    { label: 'Žánry', value: genres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {genres.map((g) => (
                          <EntityChip key={g} type="zanr" label={g} href={`/zanry/${g}`} />
                        ))}
                      </div>
                    )},
                  ]}
                />
              </SidebarCard>

              {/* Tracklist pokud existuje */}
              {Array.isArray((album as any).tracklist) && (album as any).tracklist.length > 0 && (
                <SidebarCard title={`Tracklist · ${(album as any).tracklist.length}`}>
                  <ol className="space-y-2 text-sm text-zinc-300 font-mono">
                    {(album as any).tracklist.map((t: string, i: number) => (
                      <li key={i} className="flex items-baseline gap-2.5">
                        <span className="text-[10px] text-zinc-600 shrink-0 w-5 text-right">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="leading-snug">{t}</span>
                      </li>
                    ))}
                  </ol>
                </SidebarCard>
              )}
            </>
          }
        >
          <article className="rap-prose">
            <MDXRenderer code={album.body.code} />
          </article>

          {/* Více od umělce */}
          {moreFromArtist.length > 0 && rapper && (
            <section className="mt-12 sm:mt-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Více od {rapper.title}
                </h2>
                <Link
                  href={`/raperi/${rapper.slug}/alba`}
                  className="text-[10px] font-mono uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Všechna alba →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {moreFromArtist.map((a) => (
                  <EntityCard
                    key={a.slug}
                    type="album"
                    title={a.title}
                    description={a.description}
                    href={a.url}
                    meta={String(a.year)}
                    tags={a.genre || []}
                  />
                ))}
              </div>
            </section>
          )}
        </DetailLayout>
      </div>
    </>
  )
}
