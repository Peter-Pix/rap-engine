import { allSkladbas, allRappers, allAlbums } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { JsonLd } from '@/components/seo/JsonLd'
import { DetailHero, DetailLayout, SidebarCard, InfoDl } from '@/components/shared/DetailHero'
import { EntityCard, EntityChip } from '@/components/shared/EntityCard'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allSkladbas.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const skladba = allSkladbas.find((s) => s.slug === slug)
  if (!skladba) return {}
  return {
    title: `${skladba.title} — skladba na 4rap.cz`,
    description: skladba.description,
    alternates: { canonical: skladba.canonicalUrl },
  }
}

export default async function SkladbaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const skladba = allSkladbas.find((s) => s.slug === slug)
  if (!skladba) notFound()

  const rapper = allRappers.find((r) => r.slug === skladba.rapperSlug)
  const album = skladba.albumSlug ? allAlbums.find((a) => a.slug === skladba.albumSlug) : null
  const features = Array.isArray((skladba as any).features) ? (skladba as any).features : []
  const featureRappers = features
    .map((slug: string) => allRappers.find((r) => r.slug === slug))
    .filter(Boolean)
  const producers = Array.isArray((skladba as any).producers) ? (skladba as any).producers : []

  // Více skladeb od stejného rappera
  const moreFromArtist = allSkladbas
    .filter((s) => s.rapperSlug === skladba.rapperSlug && s.slug !== skladba.slug)
    .slice(0, 4)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MusicRecording',
          name: skladba.title,
          description: skladba.description,
          url: skladba.canonicalUrl,
          ...(rapper && { byArtist: { '@type': 'MusicGroup', name: rapper.title } }),
          ...(album && { inAlbum: { '@type': 'MusicAlbum', name: album.title } }),
          ...(skladba.year && { datePublished: String(skladba.year) }),
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <DetailHero
          type="skladba"
          breadcrumbs={[
            { label: '4rap.cz', href: '/' },
            { label: 'Skladby', href: '/skladby' },
            { label: skladba.title },
          ]}
          title={skladba.title}
          subtitle={rapper?.title}
          description={skladba.description}
          chips={
            <>
              {rapper && <EntityChip type="rapper" label={rapper.title} href={rapper.url} />}
              {album && <EntityChip type="album" label={album.title} href={album.url} />}
              {skladba.year && <EntityChip type="skladba" label={String(skladba.year)} />}
              {(skladba.genre || []).map((g) => (
                <EntityChip key={g} type="zanr" label={g} href={`/zanry/${g}`} />
              ))}
            </>
          }
        />

        <DetailLayout
          sidebar={
            <>
              <SidebarCard title="Kredity">
                <InfoDl
                  items={[
                    { label: 'Rapper', value: rapper && (
                      <Link href={rapper.url} className="text-[#e4ff1a] hover:brightness-125 transition-all">
                        {rapper.title}
                      </Link>
                    )},
                    { label: 'Album', value: album && (
                      <Link href={album.url} className="text-sky-300 hover:text-sky-200 transition-colors">
                        {album.title}
                      </Link>
                    )},
                    { label: 'Rok', value: skladba.year },
                    { label: 'Features', value: featureRappers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {featureRappers.map((r: any) => (
                          <EntityChip key={r.slug} type="rapper" label={r.title} href={r.url} />
                        ))}
                      </div>
                    )},
                    { label: 'Producenti', value: producers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {producers.map((p: string) => (
                          <span key={p} className="text-xs font-mono text-zinc-400">{p}</span>
                        ))}
                      </div>
                    )},
                  ]}
                />
              </SidebarCard>
            </>
          }
        >
          <article className="rap-prose">
            <MDXRenderer code={skladba.body.code} />
          </article>

          {moreFromArtist.length > 0 && rapper && (
            <section className="mt-12 sm:mt-16">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase mb-6">
                Více od {rapper.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {moreFromArtist.map((s) => (
                  <EntityCard
                    key={s.slug}
                    type="skladba"
                    title={s.title}
                    description={s.description}
                    href={s.url}
                    meta={s.year ? String(s.year) : undefined}
                    tags={s.genre || []}
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
