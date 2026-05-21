import { allZanrs, allRappers } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { buildZanrMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import { EntityCard } from '@/components/entity/EntityCard'
import Link from 'next/link'
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
          <aside className="space-y-4">
            <div className="glass rounded-xl p-5">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">Prozkoumat žánr</h2>
              <div className="space-y-2">
                <Link href={`/zanry/${zanr.slug}/raperi`} className="flex items-center justify-between text-sm text-[#e4ff1a] hover:text-white transition-colors py-1">
                  <span>Všichni rappeři</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
                <Link href={`/zanry/${zanr.slug}/alba`} className="flex items-center justify-between text-sm text-[#60a5fa] hover:text-white transition-colors py-1">
                  <span>Všechna alba</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
                <Link href={`/zanry/${zanr.slug}/skladby`} className="flex items-center justify-between text-sm text-[#f472b6] hover:text-white transition-colors py-1">
                  <span>Všechny skladby</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
            {rappers.length > 0 && (
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 mb-3">Rappeři</h2>
                <div className="space-y-3">
                  {rappers.slice(0, 4).map((r) => <EntityCard key={r.slug} title={r.title} description={r.description} href={r.url} type="rapper" meta={r.label} />)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
