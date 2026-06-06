import { allRappers, allAlbums, allSkladbas } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildRapperMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { DetailHero, DetailLayout, SidebarCard, InfoDl } from '@/components/shared/DetailHero'
import { EntityCard, EntityChip } from '@/components/shared/EntityCard'
import { albumsByRapper, allReleasesByRapper } from '@/lib/aggregations'
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

  const albums = albumsByRapper(rapper.slug)
  const allReleases = allReleasesByRapper(rapper.slug)
  const genres = rapper.genre || []

  // Spolupráce: skladby kde je rapper uveden jako feature (features obsahuje jméno rappera)
  const collabs = allSkladbas
    .filter((s) => {
      if (!Array.isArray(s.features) || s.features.length === 0) return false
      // Check if this rapper's name appears in features
      const titleLower = rapper.title.toLowerCase()
      return s.features.some((f: string) =>
        f.toLowerCase().includes(titleLower) ||
        titleLower.includes(f.toLowerCase())
      )
    })
    .slice(0, 12)

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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <DetailHero
          type="rapper"
          breadcrumbs={[
            { label: '4rap.cz', href: '/' },
            { label: 'Rappeři', href: '/raperi' },
            { label: rapper.title },
          ]}
          title={rapper.title}
          subtitle={rapper.realName}
          description={rapper.description}
          chips={
            <>
              {genres.map((g) => (
                <EntityChip key={g} type="zanr" label={g} href={`/zanry/${g}`} />
              ))}
              {rapper.label && (
                <EntityChip type="label" label={rapper.label} href={`/labely/${rapper.label}`} />
              )}
            </>
          }
        />

        <DetailLayout
          sidebar={
            <>
              {/* Info card */}
              <SidebarCard title="Info">
                <InfoDl
                  items={[
                    { label: 'Skutečné jméno', value: rapper.realName },
                    { label: 'Label', value: rapper.label && (
                      <a href={`/labely/${rapper.label}`} className="text-violet-300 hover:text-violet-200 transition-colors">
                        {rapper.label}
                      </a>
                    )},
                    { label: 'Aktivní od', value: rapper.active },
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

              {/* Diskografie */}
              {albums.length > 0 && (
                <SidebarCard title={`Diskografie · ${albums.length}`}>
                  <ul className="space-y-2.5">
                    {albums
                      .slice()
                      .sort((a, b) => b.year - a.year)
                      .slice(0, 8)
                      .map((a) => (
                        <li key={a.slug}>
                          <a
                            href={a.url}
                            className="group flex items-baseline justify-between gap-3 text-sm"
                          >
                            <span className="text-zinc-300 group-hover:text-white transition-colors leading-snug">
                              {a.title}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                              {a.year}
                            </span>
                          </a>
                        </li>
                      ))}
                    {albums.length > 8 && (
                      <li className="pt-2 border-t border-white/5">
                        <a
                          href={`/raperi/${rapper.slug}/alba`}
                          className="text-xs font-mono uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors"
                        >
                          Všechna alba a EP →
                        </a>
                      </li>
                    )}
                  </ul>
                </SidebarCard>
              )}
            </>
          }
        >
          {/* Body — MDX longform */}
          <article className="rap-prose">
            <MDXRenderer code={rapper.body.code} />
          </article>

          {/* Albums grid pod článkem */}
          {albums.length > 0 && (
            <section className="mt-12 sm:mt-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Alba a EP
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  {albums.length} releases
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {albums.slice(0, 6).map((a) => (
                  <EntityCard
                    key={a.slug}
                    type="album"
                    title={a.title}
                    description={a.description}
                    href={a.url}
                    meta={String(a.year)}
                    tags={a.genre || []}
                    featured={a.featured}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Spolupráce */}
          {collabs.length > 0 && (
            <section className="mt-12 sm:mt-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Spolupráce
                </h2>
                <a
                  href={`/raperi/${rapper.slug}/skladby`}
                  className="text-[10px] font-mono uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Všechny spolupráce →
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {collabs.map((s) => (
                  <EntityCard
                    key={s.slug}
                    type="skladba"
                    title={s.title}
                    description={s.description || ''}
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
