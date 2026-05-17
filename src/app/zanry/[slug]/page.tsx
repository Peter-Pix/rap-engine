import { allZanrs, allRappers } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildZanrMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Metadata } from 'next'
export async function generateStaticParams() { return allZanrs.map((z) => ({ slug: z.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const zanr = allZanrs.find((z) => z.slug === slug)
  if (!zanr) return {}; return buildZanrMetadata(zanr)
}
export default async function ZanrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const zanr = allZanrs.find((z) => z.slug === slug)
  if (!zanr) notFound()
  const rappers = allRappers.filter((r) => r.genre?.includes(slug))
  
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <Breadcrumb items={[{ label: '4rap.cz', href: '/' }, { label: 'Žánry', href: '/zanry' }, { label: zanr.title }]} currentUrl={zanr.canonicalUrl} />
        <div className="mt-8 grid lg:grid-cols-[1fr_300px] gap-12">
          <div>
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-sm bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20 mb-4">Žánr</div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">{zanr.title}</h1>
              {zanr.origin && <p className="text-zinc-500 text-sm font-mono">Původ: {zanr.origin}</p>}
            </div>
            <div className="rap-prose"><MDXRenderer code={zanr.body.code} /></div>
          </div>
          <aside>
            {rappers.length > 0 && (
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-3">Rappeři tohoto žánru</h2>
                <div className="space-y-3">
                  {rappers.map((r) => <EntityCard key={r.slug} title={r.title} description={r.description} href={r.url} type="rapper" meta={r.label} />)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
