import type { Metadata } from 'next'
import { allClaneks } from 'contentlayer/generated'

import { FeaturedHero } from '@/components/magazine/FeaturedHero'
import { ArticleCard } from '@/components/magazine/ArticleCard'
import { TrendingSidebar } from '@/components/magazine/TrendingSidebar'
import { FeedFilters } from '@/components/magazine/FeedFilters'

import {
  getFeaturedArticle,
  getFeedArticles,
  getTrendingArticles,
} from '@/lib/magazine'

// ═══════════════════════════════════════════════════════════════
// Homepage = Magazín
//
// Layout:
//   ┌─────────────────────────────────────┐
//   │  FeaturedHero (full-width)          │
//   ├──────────────────────┬──────────────┤
//   │  Feed (2-col grid)   │ Trending     │
//   │  Article cards       │ sidebar      │
//   │                      │ (sticky)     │
//   └──────────────────────┴──────────────┘
// ═══════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: '4RAP — Magazín české rapové scény',
  description:
    'Recenze, profily, rozhovory a analýzy z české a slovenské rapové scény. Databáze rapperů, alb, labelů a žánrů.',
  alternates: { canonical: 'https://4rap.cz' },
  openGraph: {
    type: 'website',
    locale: 'cs_CZ',
    url: 'https://4rap.cz',
    title: '4RAP — Magazín české rapové scény',
    description: 'Recenze, profily, rozhovory a analýzy z české a slovenské rapové scény.',
  },
}

export default function MagazineHomePage() {
  const featured = getFeaturedArticle(allClaneks)
  const feed = getFeedArticles(allClaneks, featured?.slug)
  const trending = getTrendingArticles(allClaneks, featured?.slug, 5)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Featured hero */}
      <FeaturedHero article={featured} />

      {/* Layout: feed | trending */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
        {/* FEED */}
        <main>
          <FeedFilters totalCount={feed.length} />

          {feed.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {feed.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06] p-12 text-center">
              <p className="text-zinc-500 text-sm">Magazín se právě plní.</p>
            </div>
          )}
        </main>

        {/* TRENDING sidebar */}
        <TrendingSidebar items={trending} />
      </div>
    </div>
  )
}
