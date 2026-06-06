import { allZanrs, allRappers, allAlbums } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { JsonLd } from '@/components/seo/JsonLd'
import { DetailHero, DetailLayout, SidebarCard, InfoDl } from '@/components/shared/DetailHero'
import { EntityCard, EntityChip } from '@/components/shared/EntityCard'
import { rappersByZanr as getRappersByZanr, albumsByZanr as getAlbumsByZanr } from '@/lib/aggregations'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allZanrs.map((z) => ({ slug: z.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const zanr = allZanrs.find((z) => z.slug === slug)
  if (!zanr) return {}
  return {
    title: `${zanr.title} — žánr na 4rap.cz`,
    description: zanr.description,
    alternates: { canonical: zanr.canonicalUrl },
  }
}

export default async function ZanrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const zanr = allZanrs.find((z) => z.slug === slug)
  if (!zanr) notFound()

  // Použijeme aggregations lib s normalizeGenreSlug (case-insensitive match)
  const rappers = getRappersByZanr(slug)
  const albums = getAlbumsByZanr(slug)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MusicGenre',
          name: zanr.title,
          description: zanr.description,
          url: zanr.canonicalUrl,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <DetailHero
          type="zanr"
          breadcrumbs={[
            { label: '4rap.cz', href: '/' },
            { label: 'Žánry', href: '/zanry' },
            { label: zanr.title },
          ]}
          title={zanr.title}
          description={zanr.description}
          chips={
            <>
              {zanr.origin && <EntityChip type="zanr" label={zanr.origin} />}
            </>
          }
          meta={
            <>
              {rappers.length > 0 && <span>{rappers.length} rapperů</span>}
              {rappers.length > 0 && albums.length > 0 && <span aria-hidden>·</span>}
              {albums.length > 0 && <span>{albums.length} alb</span>}
            </>
          }
        />

        <DetailLayout
          sidebar={
            <>
              <SidebarCard title="O žánru">
                <InfoDl
                  items={[
                    { label: 'Původ', value: zanr.origin },
                    { label: 'Rapperů na 4RAP', value: rappers.length > 0 ? rappers.length : undefined },
                    { label: 'Alb', value: albums.length > 0 ? albums.length : undefined },
                  ]}
                />
              </SidebarCard>
            </>
          }
        >
          <article className="rap-prose">
            <MDXRenderer code={zanr.body.code} />
          </article>

          {rappers.length > 0 && (
            <section className="mt-12 sm:mt-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Rappeři v žánru
                </h2>
                <Link
                  href={`/zanry/${zanr.slug}/raperi`}
                  className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Všichni →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rappers.slice(0, 6).map((r) => (
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
            </section>
          )}

          {albums.length > 0 && (
            <section className="mt-12 sm:mt-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Klíčová alba
                </h2>
                <Link
                  href={`/zanry/${zanr.slug}/alba`}
                  className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Všechna →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {albums.slice(0, 4).map((a) => (
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
