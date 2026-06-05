import { allLabels, allRappers, allAlbums } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildLabelMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { DetailHero, DetailLayout, SidebarCard, InfoDl } from '@/components/shared/DetailHero'
import { EntityCard, EntityChip } from '@/components/shared/EntityCard'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allLabels.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const label = allLabels.find((l) => l.slug === slug)
  if (!label) return {}
  return buildLabelMetadata(label)
}

export default async function LabelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const label = allLabels.find((l) => l.slug === slug)
  if (!label) notFound()

  // Roster: rappeři kteří mají r.label === label.title
  const roster = allRappers
    .filter((r) => r.label === label.title)
    .sort((a, b) => a.title.localeCompare(b.title, 'cs'))

  // Releases: alba s labelSlug
  const releases = allAlbums
    .filter((a) => a.labelSlug === label.slug)
    .sort((a, b) => b.year - a.year)

  const labelSchema = {
    '@context': 'https://schema.org',
    '@type': 'MusicLabel',
    name: label.title,
    description: label.description,
    url: label.canonicalUrl,
    ...(label.location && { foundingLocation: label.location }),
  }

  return (
    <>
      <JsonLd data={labelSchema} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <DetailHero
          type="label"
          breadcrumbs={[
            { label: '4rap.cz', href: '/' },
            { label: 'Labely', href: '/labely' },
            { label: label.title },
          ]}
          title={label.title}
          description={label.description}
          chips={
            <>
              {label.location && (
                <EntityChip type="label" label={label.location} />
              )}
              {label.founded && (
                <EntityChip type="label" label={`zal. ${label.founded}`} />
              )}
            </>
          }
          meta={
            <>
              {roster.length > 0 && <span>{roster.length} rapperů</span>}
              {roster.length > 0 && releases.length > 0 && <span aria-hidden>·</span>}
              {releases.length > 0 && <span>{releases.length} releases</span>}
            </>
          }
        />

        <DetailLayout
          sidebar={
            <>
              <SidebarCard title="Info">
                <InfoDl
                  items={[
                    { label: 'Lokalita', value: label.location },
                    { label: 'Založeno', value: label.founded },
                    { label: 'Roster', value: roster.length > 0 ? `${roster.length} rapperů` : undefined },
                    { label: 'Releases', value: releases.length > 0 ? `${releases.length} alb` : undefined },
                  ]}
                />
              </SidebarCard>

              {/* Quick roster */}
              {roster.length > 0 && (
                <SidebarCard title={`Roster · ${roster.length}`}>
                  <ul className="space-y-2">
                    {roster.slice(0, 12).map((r) => (
                      <li key={r.slug}>
                        <Link
                          href={r.url}
                          className="block text-sm text-zinc-300 hover:text-[#e4ff1a] transition-colors leading-snug"
                        >
                          {r.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {roster.length > 12 && (
                    <Link
                      href={`/labely/${label.slug}/raperi`}
                      className="block mt-4 pt-3 border-t border-white/5 text-[10px] font-mono uppercase tracking-widest text-[#e4ff1a] hover:brightness-125 transition-all"
                    >
                      Všech {roster.length} →
                    </Link>
                  )}
                </SidebarCard>
              )}
            </>
          }
        >
          <article className="rap-prose">
            <MDXRenderer code={label.body.code} />
          </article>

          {/* Roster grid */}
          {roster.length > 0 && (
            <section className="mt-12 sm:mt-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Rappeři na labelu
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  {roster.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roster.slice(0, 9).map((r) => (
                  <EntityCard
                    key={r.slug}
                    type="rapper"
                    title={r.title}
                    description={r.description}
                    href={r.url}
                    tags={r.genre || []}
                    featured={r.featured}
                  />
                ))}
              </div>
              {roster.length > 9 && (
                <div className="mt-6 text-center">
                  <Link
                    href={`/labely/${label.slug}/raperi`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.08] hover:ring-white/20 text-xs font-mono uppercase tracking-widest text-zinc-300 transition-all"
                  >
                    Zobrazit všech {roster.length} rapperů
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Releases timeline */}
          {releases.length > 0 && (
            <section className="mt-12 sm:mt-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Releases
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  {releases.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {releases.slice(0, 8).map((a) => (
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
