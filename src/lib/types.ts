// ═══════════════════════════════════════════════════════════
// RAPENGINE — Centrální typový systém
// Každá entita je izolovaná, ale propojená přes slug reference
// ═══════════════════════════════════════════════════════════

export interface RapperEntity {
  slug: string
  title: string
  realName?: string
  born?: string
  active?: string
  label?: string
  labelSlug?: string
  genre: string[]
  description: string
  image?: string
  featured: boolean
  publishedAt: string
  updatedAt?: string
  url: string
  canonicalUrl: string
  relatedRappers: string[]
  relatedAlbums: string[]
}

export interface AlbumEntity {
  slug: string
  title: string
  rapper: string
  rapperSlug: string
  label?: string
  labelSlug?: string
  year: number
  genre: string[]
  description: string
  image?: string
  tracklist: string[]
  rating?: number
  publishedAt: string
  updatedAt?: string
  url: string
  canonicalUrl: string
}

export interface LabelEntity {
  slug: string
  title: string
  founded?: string
  location?: string
  description: string
  image?: string
  artists: string[]
  publishedAt: string
  url: string
  canonicalUrl: string
}

export interface ZanrEntity {
  slug: string
  title: string
  origin?: string
  description: string
  image?: string
  publishedAt: string
  url: string
  canonicalUrl: string
}

export interface ClanekEntity {
  slug: string
  title: string
  category: string
  description: string
  image?: string
  author?: string
  featured: boolean
  publishedAt: string
  updatedAt?: string
  tags: string[]
  readingTime: number
  url: string
  canonicalUrl: string
}

// ─── SCHEMA.ORG TYPY ─────────────────────────────────────
export type SchemaType = 
  | 'MusicGroup'
  | 'MusicAlbum'
  | 'Organization'
  | 'Article'
  | 'WebSite'
  | 'BreadcrumbList'

export interface SchemaOrg {
  '@context': 'https://schema.org'
  '@type': SchemaType | SchemaType[]
  [key: string]: unknown
}

// ─── METADATA TYPY ───────────────────────────────────────
export interface PageMetadata {
  title: string
  description: string
  canonicalUrl: string
  ogImage?: string
  publishedAt?: string
  updatedAt?: string
  type?: 'website' | 'article'
}

// ─── INTERLINKING TYPY ───────────────────────────────────
export interface EntityLink {
  text: string
  href: string
  entityType: 'rapper' | 'album' | 'label' | 'zanr'
}

export interface NavigationItem {
  label: string
  href: string
  description?: string
}
