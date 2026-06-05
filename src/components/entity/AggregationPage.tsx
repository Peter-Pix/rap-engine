// ═══════════════════════════════════════════════════════════════
// Sdílený layout pro programmatic SEO agregační stránky.
// /zanry/drill/raperi, /labely/milion-plus/alba, ...
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link'
import { EntityCard } from '@/components/entity/EntityCard'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildItemListSchema } from '@/lib/aggregations'

export type AggregationItemType = 'rapper' | 'album' | 'label' | 'zanr' | 'clanek' | 'skladba'

interface AggregationItem {
  slug: string
  title: string
  description: string
  url: string
  canonicalUrl: string
  meta?: string
  tags?: string[]
}

interface AggregationPageProps {
  /** H1 title — např. "Drill rappeři" */
  title: string
  /** Vedlejší stitek pod h1 */
  subtitle?: string
  /** Pre-titel (přejde do meta description) */
  intro: string
  /** Items k vykreslení */
  items: AggregationItem[]
  /** Typ entit (pro barvu EntityCard) */
  itemType: AggregationItemType
  /** Breadcrumb path */
  breadcrumb: Array<{ label: string; href?: string }>
  /** Canonical URL této stránky */
  canonicalUrl: string
  /** Schema.org CollectionPage name */
  schemaName: string
}

export function AggregationPage({
  title,
  subtitle,
  intro,
  items,
  itemType,
  breadcrumb,
  canonicalUrl,
  schemaName,
}: AggregationPageProps) {
  const schema = buildItemListSchema(schemaName, intro, items)

  return (
    <>
      <JsonLd data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <Breadcrumb items={breadcrumb} currentUrl={canonicalUrl} />

        <div className="mt-8 mb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="text-zinc-400 text-sm mb-4">{subtitle}</p>
          )}
          <p className="text-zinc-500 text-sm max-w-3xl leading-relaxed">{intro}</p>
        </div>

        {items.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-zinc-500 text-sm">
              Žádné záznamy. Doplň data do <code className="text-zinc-400">content/</code>.
            </p>
            <Link
              href={breadcrumb[breadcrumb.length - 2]?.href || '/'}
              className="inline-block mt-4 text-xs font-mono text-[#e4ff1a] hover:text-white"
            >
              ← Zpět
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <EntityCard
                key={item.slug}
                title={item.title}
                description={item.description}
                href={item.url}
                type={itemType}
                meta={item.meta}
                tags={item.tags}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
