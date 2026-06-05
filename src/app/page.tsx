import type { Metadata } from 'next'
import { allClaneks } from 'contentlayer/generated'

import { FeaturedHero } from '@/components/magazine/FeaturedHero'
import { TrendingSidebar } from '@/components/magazine/TrendingSidebar'
import { MagazineFeed } from '@/components/magazine/MagazineFeed'

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
          <MagazineFeed articles={feed} />
        </main>

        {/* TRENDING sidebar */}
        <TrendingSidebar items={trending} />
      </div>
    </div>
  )
}
