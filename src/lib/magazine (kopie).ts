import type { Clanek } from 'contentlayer/generated'

// ═══════════════════════════════════════════════════════════════
// Magazine data helpers
//
// Slouží jako jednotná vrstva mezi Contentlayer (allClaneks) a
// magazine komponentami. Až přejdeš na nový entity-store, stačí
// nahradit tělo těchto funkcí — komponenty zůstanou.
// ═══════════════════════════════════════════════════════════════

export interface ArticleListItem {
  title: string
  slug: string
  url: string
  description: string
  category: string
  publishedAt: string
  tags?: string[]
  readingTime?: number
  featured?: boolean
  image?: string
}

/** Mapping z Clanek (Contentlayer doc) na list item (s defenzivními defaults). */
export function toListItem(c: Clanek): ArticleListItem {
  return {
    title: c.title,
    slug: c.slug,
    url: c.url,
    description: c.description,
    category: c.category,
    publishedAt: c.publishedAt,
    tags: c.tags ?? [],
    readingTime: (c as any).readingTime,
    featured: c.featured,
    image: c.image,
  }
}

/** Hlavní featured článek pro hero. Pokud žádný `featured: true`, vezme nejnovější. */
export function getFeaturedArticle(articles: Clanek[]): ArticleListItem | null {
  if (!articles?.length) return null
  const featured = articles.filter((a) => a.featured)
  const sorted = (featured.length ? featured : articles).slice().sort(byNewest)
  return sorted[0] ? toListItem(sorted[0]) : null
}

/** Feed = vše ostatní, řazené od nejnovějšího. Vynechává hero článek. */
export function getFeedArticles(articles: Clanek[], excludeSlug?: string): ArticleListItem[] {
  if (!articles?.length) return []
  return articles
    .filter((a) => a.slug !== excludeSlug)
    .slice()
    .sort(byNewest)
    .map(toListItem)
}

/**
 * Trending = TOP 5 vybraných podle weight:
 *   • featured = +50
 *   • <14 dní = +20
 *   • <30 dní = +10
 *   • base = ageBonus (newer = higher)
 *
 * Až přidáš analytics view counts, refactor sem.
 */
export function getTrendingArticles(articles: Clanek[], excludeSlug?: string, limit = 5): ArticleListItem[] {
  if (!articles?.length) return []
  const now = Date.now()
  const scored = articles
    .filter((a) => a.slug !== excludeSlug)
    .map((a) => {
      const ageDays = Math.max(0, (now - new Date(a.publishedAt).getTime()) / (1000 * 60 * 60 * 24))
      let score = Math.max(0, 100 - ageDays)
      if (a.featured) score += 50
      if (ageDays < 14) score += 20
      else if (ageDays < 30) score += 10
      return { article: a, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((s) => toListItem(s.article))
}

/** Sekundární UI pomocníci */

const byNewest = (a: Clanek, b: Clanek) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()

/** Czech-localized date: "17. května 2026" / "17. 5. 2026" (short) */
export function formatCzechDate(iso: string, opts?: { short?: boolean }): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso

  if (opts?.short) {
    return new Intl.DateTimeFormat('cs-CZ', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).format(d).replace(/\s/g, ' ')
  }

  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(d).toUpperCase()
}

/** Je článek "čerstvý" (<N dní)? Default 14 dní = NEW badge limit. */
export function isRecent(iso: string, withinDays = 14): boolean {
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return false
  return (Date.now() - d) / (1000 * 60 * 60 * 24) <= withinDays
}

/** Spočítá kolik článků je <X dní pro header badge */
export function countRecent(articles: Clanek[], withinDays = 7): number {
  return articles.filter((a) => isRecent(a.publishedAt, withinDays)).length
}
