import Link from 'next/link'
import { CategoryBadge, NewBadge } from './CategoryBadge'
import { TagList } from './TagPill'
import { formatCzechDate, isRecent } from '@/lib/magazine'

// ═══════════════════════════════════════════════════════════════
// ArticleCard v2.3 — diacritic-safe titulek
//
// FIX v2.3: konzistentní line-height s ostatními hero komponentami
// + cz-display class pro safe glyph rendering.
// ═══════════════════════════════════════════════════════════════

export interface ArticleCardData {
  title: string
  slug: string
  url: string
  description: string
  category: string
  publishedAt: string
  tags?: string[]
  readingTime?: number
}

interface ArticleCardProps {
  article: ArticleCardData
  className?: string
}

export function ArticleCard({ article, className = '' }: ArticleCardProps) {
  const showNew = isRecent(article.publishedAt, 14)

  return (
    <Link
      href={article.url}
      className={[
        'group relative flex flex-col rounded-xl sm:rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06]',
        'hover:bg-zinc-900/60 hover:ring-white/15 transition-all',
        'p-4 sm:p-6 h-full',
        className,
      ].join(' ')}
    >
      <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
        <CategoryBadge category={article.category} />
        <time
          dateTime={article.publishedAt}
          className="text-[10px] font-mono uppercase tracking-widest text-zinc-500"
        >
          {formatCzechDate(article.publishedAt, { short: true })}
        </time>
        {showNew && <NewBadge />}
      </div>

      <h2 className="cz-display text-base sm:text-xl md:text-2xl font-black tracking-tight text-white uppercase leading-[1.15] mb-2 sm:mb-3 group-hover:text-zinc-50 transition-colors text-balance">
        {article.title}
      </h2>

      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-3 sm:mb-5 line-clamp-3 flex-1">
        {article.description}
      </p>

      {article.tags && article.tags.length > 0 && (
        <div className="mb-3 sm:mb-5">
          <TagList tags={article.tags} limit={2} clickable={false} />
        </div>
      )}

      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          {article.readingTime ?? 5} min čtení
        </span>
        <svg
          className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
