import { allRappers, allAlbums, allLabels, allZanrs, allClaneks } from 'contentlayer/generated'
import type { MetadataRoute } from 'next'

const BASE_URL = 'https://4rap.cz'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/raperi`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/alba`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/labely`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/zanry`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/clanky`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/skladby`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
  ]

  const rapperPages: MetadataRoute.Sitemap = allRappers.map((r) => ({
    url: r.canonicalUrl,
    lastModified: new Date(r.updatedAt || r.publishedAt || Date.now()),
    changeFrequency: 'monthly',
    priority: r.featured ? 0.9 : 0.8,
  }))

  const albumPages: MetadataRoute.Sitemap = allAlbums.map((a) => ({
    url: a.canonicalUrl,
    lastModified: new Date(a.updatedAt || a.publishedAt || Date.now()),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const labelPages: MetadataRoute.Sitemap = allLabels.map((l) => ({
    url: l.canonicalUrl,
    lastModified: new Date(l.publishedAt || Date.now()),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const zanrPages: MetadataRoute.Sitemap = allZanrs.map((z) => ({
    url: z.canonicalUrl,
    lastModified: new Date(z.publishedAt || Date.now()),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const clanekPages: MetadataRoute.Sitemap = allClaneks.map((c) => ({
    url: c.canonicalUrl,
    lastModified: new Date(c.updatedAt || c.publishedAt || Date.now()),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  
  // ═══════════════════════════════════════════════════════
  // PROGRAMMATIC SEO — agregační stránky
  // ═══════════════════════════════════════════════════════
  
  // /zanry/[slug]/raperi, /alba (skladby vynechány — noindex, thin content)
  const zanrAggregations: MetadataRoute.Sitemap = allZanrs.flatMap((z) => [
    {
      url: `${BASE_URL}/zanry/${z.slug}/raperi`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/zanry/${z.slug}/alba`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ])

  // /labely/[slug]/raperi, /alba
  const labelAggregations: MetadataRoute.Sitemap = allLabels.flatMap((l) => [
    {
      url: `${BASE_URL}/labely/${l.slug}/raperi`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/labely/${l.slug}/alba`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ])

  // /raperi/[slug]/alba (skladby vynechány — noindex, thin content)
  const rapperAggregations: MetadataRoute.Sitemap = allRappers.flatMap((r) => [
    {
      url: `${BASE_URL}/raperi/${r.slug}/alba`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    },
  ])

  return [...staticPages, ...rapperPages, ...albumPages, ...labelPages, ...zanrPages, ...clanekPages, ...zanrAggregations, ...labelAggregations, ...rapperAggregations]
}
