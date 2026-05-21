import { allLabels, allRappers } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildLabelMetadata } from '@/lib/metadata'
import { getLabelSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Metadata } from 'next'
export async function generateStaticParams() { return allLabels.map((l) => ({ slug: l.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const label = allLabels.find((l) => l.slug === slug)
  if (!label) return {}; return buildLabelMetadata(label)
}
export default async function LabelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const label = allLabels.find((l) => l.slug === slug)
  if (!label) notFound()
  const artists = allRappers.filter((r) => label.artists?.includes(r.slug))
  const labelSchema = getLabelSchema({ slug: label.slug, title: label.title, description: label.description, image: label.image, founded: label.founded, location: label.location, artists: label.artists || [], publishedAt: label.publishedAt, url: label.url, canonicalUrl: label.canonicalUrl })
  
  return (
    <>
      <JsonLd data={labelSchema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <Breadcrumb items={[{ label: '4rap.cz', href: '/' }, { label: 'Labely', href: '/labely' }, { label: label.title }]} currentUrl={label.canonicalUrl} />
        <div className="mt-8 grid lg:grid-cols-[1fr_300px] gap-12">
          <div>
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-sm bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 mb-4">Label</div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">{label.title}</h1>
              {label.founded && <p className="text-zinc-500 text-sm font-mono">Založen {label.founded}{label.location && ` · ${label.location}`}</p>}
            </div>
            <div className="rap-prose"><MDXRenderer code={label.body.code} /></div>
          </div>
          <aside className="space-y-4">
            {artists.length > 0 && (
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-3">Umělci</h2>
                <div className="space-y-3">
                  {artists.map((r) => <EntityCard key={r.slug} title={r.title} description={r.description} href={r.url} type="rapper" tags={r.genre} />)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
