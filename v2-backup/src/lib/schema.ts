// ═══════════════════════════════════════════════════════════
// RAPENGINE — Schema.org Generátor
// Každá entita dostane správný strukturovaný markup pro Google
// ═══════════════════════════════════════════════════════════

import type { RapperEntity, AlbumEntity, LabelEntity, ZanrEntity } from './types'

const BASE_URL = 'https://4rap.cz'

// ─── WEBSITE SCHEMA ──────────────────────────────────────
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '4rap.cz',
    alternateName: 'Česká rapová scéna',
    url: BASE_URL,
    description: 'Největší databáze a magazín české rapové scény. Rappeři, alba, labely, žánry.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/hledej?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: '4rap.cz',
      url: BASE_URL,
    },
  }
}

// ─── RAPPER SCHEMA (MusicGroup) ──────────────────────────
export function getRapperSchema(rapper: RapperEntity) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: rapper.title,
    ...(rapper.realName && { alternateName: rapper.realName }),
    description: rapper.description,
    url: rapper.canonicalUrl,
    ...(rapper.image && { image: rapper.image }),
    genre: rapper.genre,
    ...(rapper.label && {
      record: {
        '@type': 'MusicRecordLabel',
        name: rapper.label,
        ...(rapper.labelSlug && { url: `${BASE_URL}/labely/${rapper.labelSlug}` }),
      },
    }),
    ...(rapper.born && {
      member: {
        '@type': 'Person',
        name: rapper.realName || rapper.title,
        birthDate: rapper.born,
      },
    }),
    sameAs: [],
  }
}

// ─── ALBUM SCHEMA (MusicAlbum) ───────────────────────────
export function getAlbumSchema(album: AlbumEntity) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: album.title,
    description: album.description,
    url: album.canonicalUrl,
    ...(album.image && { image: album.image }),
    datePublished: String(album.year),
    byArtist: {
      '@type': 'MusicGroup',
      name: album.rapper,
      url: `${BASE_URL}/raperi/${album.rapperSlug}`,
    },
    ...(album.label && {
      recordLabel: {
        '@type': 'MusicRecordLabel',
        name: album.label,
        ...(album.labelSlug && { url: `${BASE_URL}/labely/${album.labelSlug}` }),
      },
    }),
    ...(album.tracklist.length > 0 && {
      track: album.tracklist.map((track, i) => ({
        '@type': 'MusicRecording',
        name: track,
        position: i + 1,
      })),
    }),
    ...(album.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: album.rating,
        bestRating: 10,
        worstRating: 0,
        ratingCount: 1,
      },
    }),
  }
}

// ─── LABEL SCHEMA (Organization + MusicRecordLabel) ──────
export function getLabelSchema(label: LabelEntity) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'MusicRecordLabel'],
    name: label.title,
    description: label.description,
    url: label.canonicalUrl,
    ...(label.image && { image: label.image }),
    ...(label.founded && { foundingDate: label.founded }),
    ...(label.location && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: label.location,
        addressCountry: 'CZ',
      },
    }),
  }
}

// ─── BREADCRUMB SCHEMA ───────────────────────────────────
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ─── ARTICLE SCHEMA ──────────────────────────────────────
export function getArticleSchema(article: {
  title: string
  description: string
  url: string
  image?: string
  publishedAt: string
  updatedAt?: string
  author?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url,
    ...(article.image && { image: article.image }),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.author || '4rap.cz',
    },
    publisher: {
      '@type': 'Organization',
      name: '4rap.cz',
      url: BASE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  }
}
