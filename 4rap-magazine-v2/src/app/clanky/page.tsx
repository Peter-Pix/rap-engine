import { allClaneks } from 'contentlayer/generated'
import { ListingHero, StatsBar, EmptyState } from '@/components/shared/ListingHero'
import { ArticleCard } from '@/components/magazine/ArticleCard'
import { toListItem } from '@/lib/magazine'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Články — Magazín české rapové scény',
  description:
    'Recenze, profily, rozhovory a analýzy z české a slovenské rapové scény.',
  alternates: { canonical: 'https://4rap.cz/clanky' },
}

export default function ClankyPage() {
  // Stejný styl jako homepage, ale BEZ featured hero — všechny články do gridu
  const articles = allClaneks
    .slice()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .map(toListItem)

  // Kategorie counts pro hero stats
  const categoryCount = new Set(articles.map((a) => a.category)).size
  const featuredCount = articles.filter((a) => a.featured).length

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <ListingHero
        kicker="Magazín"
        kickerColor="#fb923c"
        title="Články"
        description="Editorials, recenze, profily a analýzy — pohled na českou a slovenskou rap scénu zevnitř."
        meta={
          <StatsBar
            items={[
              { label: 'článků', value: articles.length, color: '#fb923c' },
              { label: 'kategorií', value: categoryCount, color: '#fb923c' },
              { label: 'featured', value: featuredCount, color: '#fb923c' },
            ]}
          />
        }
      />

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Magazín se právě plní"
          description="První články brzy dorazí."
        />
      )}
    </div>
  )
}
