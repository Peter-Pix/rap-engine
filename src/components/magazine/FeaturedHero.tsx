import Link from 'next/link'
import { CategoryBadge } from './CategoryBadge'
import { TagList } from './TagPill'
import { formatCzechDate } from '@/lib/magazine'

// ═══════════════════════════════════════════════════════════════
// FeaturedHero — velká featured kartka v top části magazínu
//
// Vybírá first article s `featured: true`, nebo nejnovější jinak.
// Title je masivně velký bold uppercase. Image volitelný.
// Karta = celá <Link>, ne jen nadpis (větší klikatelná plocha).
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
    <section className="mb-12">
      <Link
        href={article.url}
        className="group relative block rounded-3xl bg-gradient-to-br from-zinc-900/60 to-zinc-950/60 ring-1 ring-white/10 hover:ring-white/20 transition-all overflow-hidden"
      >
        {/* Subtle background grain pro magazín feel */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' /%3E%3C/svg%3E")',
          }}
          aria-hidden
        />

        <div className="relative p-8 sm:p-12">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <CategoryBadge category="featured" />
            <CategoryBadge category={article.category} />
            <time
              dateTime={article.publishedAt}
              className="text-xs font-mono uppercase tracking-widest text-zinc-500"
            >
              {formatCzechDate(article.publishedAt)}
            </time>
          </div>

          {/* Title — masivní display */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white uppercase leading-[0.92] mb-6 group-hover:text-zinc-50 transition-colors">
            {article.title}
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-zinc-400 max-w-3xl leading-relaxed mb-8">
            {article.description}
          </p>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <TagList tags={article.tags} limit={6} clickable={false} />
          )}
        </div>
      </Link>
    </section>
  )
}
