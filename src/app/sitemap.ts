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
  ]

  const rapperPages: MetadataRoute.Sitemap = allRappers.map((r) => ({
    url: r.canonicalUrl,
    lastModified: new Date(r.updatedAt || r.publishedAt),
    changeFrequency: 'monthly',
    priority: r.featured ? 0.9 : 0.8,
  }))

  const albumPages: MetadataRoute.Sitemap = allAlbums.map((a) => ({
    url: a.canonicalUrl,
    lastModified: new Date(a.updatedAt || a.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const labelPages: MetadataRoute.Sitemap = allLabels.map((l) => ({
    url: l.canonicalUrl,
    lastModified: new Date(l.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const zanrPages: MetadataRoute.Sitemap = allZanrs.map((z) => ({
    url: z.canonicalUrl,
    lastModified: new Date(z.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const clanekPages: MetadataRoute.Sitemap = allClaneks.map((c) => ({
    url: c.canonicalUrl,
    lastModified: new Date(c.updatedAt || c.publishedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticPages, ...rapperPages, ...albumPages, ...labelPages, ...zanrPages, ...clanekPages]
}
