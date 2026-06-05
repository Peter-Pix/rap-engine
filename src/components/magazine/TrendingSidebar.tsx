import Link from 'next/link'
import { CategoryDotLabel } from './CategoryBadge'

// ═══════════════════════════════════════════════════════════════
// TrendingSidebar — pravý sticky sidebar s číslovaným seznamem
//
// "Trending" může znamenat různé věci:
//   • Skutečné view counts (vyžaduje analytics → fáze 5)
//   • Featured + nedávné (MVP) - viz lib/magazine.ts:getTrendingArticles
//
// Sticky behavior: drží se na obrazovce při scroll, dokud nedojde k
// patičce. Aktivuje se až od md breakpointu — na mobile se schová.
// ═══════════════════════════════════════════════════════════════

export interface TrendingItem {
  title: string
  url: string
  category: string
  /** Krátký truncated preview pro sidebar (vejde se ~50 znaků) */
  shortTitle?: string
}

interface TrendingSidebarProps {
  items: TrendingItem[]
  title?: string
}

export function TrendingSidebar({ items, title = 'TRENDING' }: TrendingSidebarProps) {
  if (!items?.length) return null

  return (
    <aside className="hidden md:block">
      <div className="sticky top-24 rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06] p-6">
        <h2 className="flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-widest text-white mb-6">
          <span aria-hidden>🔥</span>
          {title}
        </h2>

        <ol className="space-y-5">
          {items.slice(0, 5).map((item, i) => (
            <li key={item.url} className="group">
              <Link href={item.url} className="flex items-start gap-3">
                <span className="font-mono text-xs font-bold text-zinc-600 group-hover:text-zinc-400 transition-colors pt-1 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <CategoryDotLabel category={item.category} className="mb-1.5" />
                  <p className="text-sm text-zinc-300 group-hover:text-white leading-snug font-bold uppercase tracking-tight transition-colors line-clamp-2">
                    {truncate(item.shortTitle ?? item.title, 60)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  )
}

function truncate(s: string, n: number): string {
  if (!s) return ''
  if (s.length <= n) return s
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…'
}
