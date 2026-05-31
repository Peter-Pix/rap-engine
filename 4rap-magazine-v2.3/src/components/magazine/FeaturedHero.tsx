import Link from 'next/link'
import { CategoryBadge } from './CategoryBadge'
import { TagList } from './TagPill'
import { formatCzechDate } from '@/lib/magazine'

// ═══════════════════════════════════════════════════════════════
// FeaturedHero v2.3 — diakritika-safe typography
//
// FIX v2.3:
//   • Stejný typography pattern jako Listing/Detail Hero
//   • Konzistentní: 26px → 36px → 48px → 56px
//   • Featured je o 1 stupeň větší než ostatní hero (je hero!)
//   • Line-height ≥ 1.05 napříč — diakritika safe
// ═══════════════════════════════════════════════════════════════

export interface FeaturedArticleData {
  title: string
  slug: string
  url: string
  description: string
  category: string
  publishedAt: string
  tags?: string[]
  image?: string
}

interface FeaturedHeroProps {
  article: FeaturedArticleData | null
}

export function FeaturedHero({ article }: FeaturedHeroProps) {
  if (!article) return null

  return (
    <section className="mb-8 sm:mb-12">
      <Link
        href={article.url}
        className="group relative block rounded-xl sm:rounded-3xl bg-gradient-to-br from-zinc-900/60 to-zinc-950/60 ring-1 ring-white/10 hover:ring-white/20 transition-all overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' /%3E%3C/svg%3E")',
          }}
          aria-hidden
        />

        <div className="relative p-5 sm:p-8 md:p-12">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-4 sm:mb-8">
            <CategoryBadge category="featured" />
            <CategoryBadge category={article.category} />
            <time
              dateTime={article.publishedAt}
              className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-500"
            >
              {formatCzechDate(article.publishedAt)}
            </time>
          </div>

          {/* Featured title — o stupeň větší než ListingHero/DetailHero
              ale stále diakritika-safe (leading ≥1.05 na lg) */}
          <h1
            className="cz-display font-black uppercase text-white mb-3 sm:mb-6 group-hover:text-zinc-50 transition-colors
                       text-[1.625rem] leading-[1.1]
                       sm:text-4xl sm:leading-[1.06] sm:tracking-tight
                       md:text-5xl
                       lg:text-6xl lg:leading-[1.05] lg:tracking-tight
                       text-balance hyphens-none"
            style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
          >
            {article.title}
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-3xl leading-relaxed mb-4 sm:mb-8">
            {article.description}
          </p>

          {article.tags && article.tags.length > 0 && (
            <TagList tags={article.tags} limit={6} clickable={false} />
          )}
        </div>
      </Link>
    </section>
  )
}
