import Link from 'next/link'
import { CategoryBadge, NewBadge } from './CategoryBadge'
import { TagList } from './TagPill'
import { formatCzechDate, isRecent } from '@/lib/magazine'

// ═══════════════════════════════════════════════════════════════
// ArticleCard — karta v 2-col feed gridu
//
// Header row:  [kategorie pill]  [datum]  [NEW badge pokud < 14 dní]
// Title:       uppercase, bold
// Description: 2-3 řádky
// Tags:        prvních N + "+X" indikátor
// Footer:      "X min čtení" → arrow (decoration)
//
// Celá karta je <Link>. Hover = subtle border highlight + bg shift.
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
        'group relative flex flex-col rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06]',
        'hover:bg-zinc-900/60 hover:ring-white/15 transition-all',
        'p-6 h-full',
        className,
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <CategoryBadge category={article.category} />
        <time
          dateTime={article.publishedAt}
          className="text-[10px] font-mono uppercase tracking-widest text-zinc-500"
        >
          {formatCzechDate(article.publishedAt, { short: true })}
        </time>
        {showNew && <NewBadge />}
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase leading-tight mb-3 group-hover:text-zinc-50 transition-colors">
        {article.title}
      </h2>

      {/* Description */}
      <p className="text-sm text-zinc-400 leading-relaxed mb-5 line-clamp-3 flex-1">
        {article.description}
      </p>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mb-5">
          <TagList tags={article.tags} limit={2} clickable={false} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
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
