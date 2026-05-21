import { allSkladbas, allRappers, allAlbums } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildSkladbaMetadata } from '@/lib/metadata'
import { getSkladbaSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import { EntityCard } from '@/components/entity/EntityCard'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allSkladbas.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const track = allSkladbas.find((s) => s.slug === slug)
  if (!track) return {}
  return buildSkladbaMetadata(track)
}

export default async function SkladbaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const track = allSkladbas.find((s) => s.slug === slug)
  if (!track) notFound()

  const rapper = allRappers.find((r) => r.slug === track.rapperSlug)
  const album = track.albumSlug ? allAlbums.find((a) => a.slug === track.albumSlug) : null
  const features = track.features
    ? allRappers.filter((r) => track.features?.includes(r.slug))
    : []

  const schema = getSkladbaSchema({
    slug: track.slug,
    title: track.title,
    rapper: track.rapper,
    rapperSlug: track.rapperSlug,
    features: track.features,
    featuresNames: track.featuresNames,
    album: track.album,
    albumSlug: track.albumSlug,
    year: track.year,
    genre: track.genre || [],
    duration: track.duration,
    description: track.description,
    canonicalUrl: track.canonicalUrl,
    image: track.image,
    producersNames: track.producersNames,
  })

  return (
    <>
      <JsonLd data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <Breadcrumb
          items={[
            { label: '4rap.cz', href: '/' },
            { label: 'Skladby', href: '/skladby' },
            { label: track.title },
          ]}
          currentUrl={track.canonicalUrl}
        />

        <div className="mt-8 grid lg:grid-cols-[1fr_320px] gap-12">
          <div>
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {track.genre?.map((g) => (
                  <Link
                    key={g}
                    href={`/zanry/${g}`}
                    className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-sm bg-[#f472b6]/10 text-[#f472b6] border border-[#f472b6]/20 hover:bg-[#f472b6]/20 transition-colors"
                  >
                    {g}
                  </Link>
                ))}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3">
                {track.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-zinc-400">
                <Link
                  href={`/raperi/${track.rapperSlug}`}
                  className="hover:text-[#e4ff1a] transition-colors font-medium"
                >
                  {track.rapper}
                </Link>
                {features.length > 0 && (
                  <>
                    <span className="text-zinc-600">feat.</span>
                    {features.map((f, i) => (
                      <span key={f.slug}>
                        <Link
                          href={`/raperi/${f.slug}`}
                          className="hover:text-[#e4ff1a] transition-colors font-medium"
                        >
                          {f.title}
                        </Link>
                        {i < features.length - 1 && <span className="text-zinc-600">, </span>}
                      </span>
                    ))}
                  </>
                )}
                {track.album && track.albumSlug && (
                  <>
                    <span className="text-zinc-600 mx-1">·</span>
                    <Link
                      href={`/alba/${track.albumSlug}`}
                      className="hover:text-[#60a5fa] transition-colors"
                    >
                      {track.album}
                    </Link>
                  </>
                )}
                {track.year && (
                  <>
                    <span className="text-zinc-600 mx-1">·</span>
                    <span>{track.year}</span>
                  </>
                )}
              </div>
            </div>

            <div className="rap-prose">
              <MDXRenderer code={track.body.code} />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">
                Skladba
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-zinc-600 mb-0.5">Rapper</dt>
                  <dd>
                    <Link
                      href={`/raperi/${track.rapperSlug}`}
                      className="text-sm text-[#e4ff1a] hover:text-white transition-colors"
                    >
                      {track.rapper}
                    </Link>
                  </dd>
                </div>
                {features.length > 0 && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Feat.</dt>
                    <dd className="text-sm space-x-2">
                      {features.map((f) => (
                        <Link
                          key={f.slug}
                          href={`/raperi/${f.slug}`}
                          className="text-[#e4ff1a] hover:text-white transition-colors"
                        >
                          {f.title}
                        </Link>
                      ))}
                    </dd>
                  </div>
                )}
                {track.album && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Album</dt>
                    <dd className="text-sm">
                      {track.albumSlug ? (
                        <Link
                          href={`/alba/${track.albumSlug}`}
                          className="text-[#60a5fa] hover:text-[#93c5fd] transition-colors"
                        >
                          {track.album}
                        </Link>
                      ) : (
                        <span className="text-zinc-200">{track.album}</span>
                      )}
                    </dd>
                  </div>
                )}
                {track.year && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Rok</dt>
                    <dd className="text-sm text-zinc-200">{track.year}</dd>
                  </div>
                )}
                {track.duration && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Délka</dt>
                    <dd className="text-sm text-zinc-200 font-mono">{track.duration}</dd>
                  </div>
                )}
                {track.trackNumber && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Pořadí</dt>
                    <dd className="text-sm text-zinc-200 font-mono">#{track.trackNumber}</dd>
                  </div>
                )}
                {track.producersNames && track.producersNames.length > 0 && (
                  <div>
                    <dt className="text-xs text-zinc-600 mb-0.5">Produkce</dt>
                    <dd className="text-sm text-zinc-200">{track.producersNames.join(', ')}</dd>
                  </div>
                )}
              </dl>
            </div>

            {album && (
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-3">
                  Album
                </h2>
                <EntityCard
                  title={album.title}
                  description={album.description}
                  href={album.url}
                  type="album"
                  meta={`${album.rapper} · ${album.year}`}
                  tags={album.genre || []}
                />
              </div>
            )}

            {rapper && (
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-3">
                  Rapper
                </h2>
                <EntityCard
                  title={rapper.title}
                  description={rapper.description}
                  href={rapper.url}
                  type="rapper"
                  meta={rapper.label}
                  tags={rapper.genre || []}
                />
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
