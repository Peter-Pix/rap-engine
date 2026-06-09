import type { Metadata } from 'next'

const BASE_URL = 'https://4rap.cz'
const SITE_NAME = '4rap.cz'

function ogUrl(params: Record<string, string>) {
  const q = new URLSearchParams(params)
  return `${BASE_URL}/og?${q.toString()}`
}

function buildMetadata(page: {
  title: string
  description: string
  canonicalUrl: string
  ogImage?: string
  ogParams?: Record<string, string>
  publishedAt?: string
  updatedAt?: string
  type?: 'website' | 'article'
}): Metadata {
  const ogImg = page.ogImage || ogUrl(page.ogParams || { title: page.title })
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.canonicalUrl },
    openGraph: {
      title: `${page.title} | ${SITE_NAME}`,
      description: page.description,
      url: page.canonicalUrl,
      siteName: SITE_NAME,
      locale: 'cs_CZ',
      type: page.type || 'website',
      images: [{ url: ogImg, width: 1200, height: 630, alt: page.title }],
      ...(page.publishedAt && { publishedTime: page.publishedAt }),
      ...(page.updatedAt && { modifiedTime: page.updatedAt }),
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: [ogImg],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  }
}

export function buildRapperMetadata(rapper: {
  title: string; description?: string; slug: string
  label?: string; image?: string; publishedAt?: string; updatedAt?: string
}): Metadata {
  const labelStr = rapper.label ? ` | ${rapper.label}` : ''
  return buildMetadata({
    title: `${rapper.title}${labelStr} — Profil rappera`,
    description: (rapper.description ?? '').slice(0, 155),
    canonicalUrl: `${BASE_URL}/raperi/${rapper.slug}`,
    ogImage: rapper.image,
    ogParams: { title: rapper.title, type: 'rapper', label: rapper.label || '' },
    type: 'article',
    publishedAt: rapper.publishedAt, updatedAt: rapper.updatedAt,
  })
}

export function buildAlbumMetadata(album: {
  title: string; rapper: string; description?: string; slug: string
  year: number; image?: string; publishedAt?: string
}): Metadata {
  return buildMetadata({
    title: `${album.title} — ${album.rapper} (${album.year})`,
    description: (album.description ?? '').slice(0, 155),
    canonicalUrl: `${BASE_URL}/alba/${album.slug}`,
    ogImage: album.image,
    ogParams: { title: album.title, type: 'album', label: album.rapper, year: String(album.year) },
    type: 'article', publishedAt: album.publishedAt,
  })
}

export function buildLabelMetadata(label: {
  title: string; description?: string; slug: string; image?: string; publishedAt?: string
}): Metadata {
  return buildMetadata({
    title: `${label.title} — Label české rapové scény`,
    description: (label.description ?? '').slice(0, 155),
    canonicalUrl: `${BASE_URL}/labely/${label.slug}`,
    ogImage: label.image,
    ogParams: { title: label.title, type: 'label' },
    type: 'website', publishedAt: label.publishedAt,
  })
}

export function buildZanrMetadata(zanr: {
  title: string; description?: string; slug: string; image?: string; publishedAt?: string
}): Metadata {
  return buildMetadata({
    title: `${zanr.title} — Žánr české rapové scény`,
    description: (zanr.description ?? '').slice(0, 155),
    canonicalUrl: `${BASE_URL}/zanry/${zanr.slug}`,
    ogImage: zanr.image,
    ogParams: { title: zanr.title, type: 'zanr' },
    type: 'website', publishedAt: zanr.publishedAt,
  })
}
export function buildSkladbaMetadata(track: {
  title: string
  rapper: string
  album?: string
  description?: string
  slug: string
  year?: number
  image?: string
  publishedAt?: string
}): Metadata {
  const yearStr = track.year ? ` (${track.year})` : ''
  const albumStr = track.album ? ` z alba ${track.album}` : ''
  return buildMetadata({
    title: `${track.title} — ${track.rapper}${albumStr}${yearStr}`,
    description: (track.description ?? '').slice(0, 155),
    canonicalUrl: `${BASE_URL}/skladby/${track.slug}`,
    ogImage: track.image,
    ogParams: { title: track.title, type: 'skladba', label: track.rapper, year: yearStr.replace(/[()]/g, '') },
    type: 'article',
    publishedAt: track.publishedAt,
  })
}
