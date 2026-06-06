import type { Metadata } from 'next'
import Link from 'next/link'
import { allClaneks, allRappers, allZanrs } from 'contentlayer/generated'

import { FeaturedHero } from '@/components/magazine/FeaturedHero'
import { TrendingSidebar } from '@/components/magazine/TrendingSidebar'
import { MagazineFeed } from '@/components/magazine/MagazineFeed'
import { EntityCard } from '@/components/shared/EntityCard'

import {
  getFeaturedArticle,
  getFeedArticles,
  getTrendingArticles,
} from '@/lib/magazine'
import { pickDaily, todayStr } from '@/lib/daily-pick'

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

  const dailyRappers = pickDaily(allRappers, 3, todayStr()).map((r) => ({
    title: r.title,
    slug: r.slug,
    description: r.description,
    image: r.image,
    genre: Array.isArray(r.genre) ? r.genre : (r.subgenres ?? []),
  }))

  const dailyZanrs = pickDaily(allZanrs, 3, todayStr()).map((z) => ({
    title: z.title,
    slug: z.slug,
    description: z.description,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Featured hero */}
      <FeaturedHero article={featured} />

      {/* Daily rappers — 3 random, mění se 1x denně */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white flex items-center gap-2">
            <span aria-hidden>🎤</span>
            RAPPEŘI DNE
          </h2>
          <Link
            href="/raperi"
            className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Všichni rappeři →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {dailyRappers.map((r) => (
            <EntityCard
              key={r.slug}
              type="rapper"
              title={r.title}
              description={r.description}
              href={`/raperi/${r.slug}`}
              tags={r.genre?.slice(0, 3)}
            />
          ))}
        </div>
      </section>

      {/* Daily genres — 3 random, mění se 1x denně */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white flex items-center gap-2">
            <span aria-hidden>🏷️</span>
            ŽÁNRY DNE
          </h2>
          <Link
            href="/zanry"
            className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Všechny žánry →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {dailyZanrs.map((z) => (
            <EntityCard
              key={z.slug}
              type="zanr"
              title={z.title}
              description={z.description}
              href={`/zanry/${z.slug}`}
            />
          ))}
        </div>
      </section>

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
