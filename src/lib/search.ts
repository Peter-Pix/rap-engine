// ═══════════════════════════════════════════════════════════════
// RAPENGINE — Search helpers
//
// Sdílené typy a funkce pro full-text search napříč všemi entitami.
// Index se generuje server-side, search běží client-side přes minisearch.
// ═══════════════════════════════════════════════════════════════

export type SearchEntityType = 'rapper' | 'album' | 'label' | 'zanr' | 'skladba' | 'clanek'

export interface SearchDocument {
  /** Unique ID — kombinace typu a slugu (např. "rapper:yzomandias") */
  id: string
  type: SearchEntityType
  title: string
  slug: string
  url: string
  description: string
  /** Searchable secondary text — např. realName, rapper, album */
  context?: string
  /** Pro řazení v dropdown */
  featured?: boolean
}

export const ENTITY_TYPE_LABELS: Record<SearchEntityType, string> = {
  rapper:  'Rapper',
  album:   'Album',
  label:   'Label',
  zanr:    'Žánr',
  skladba: 'Skladba',
  clanek:  'Článek',
}

export const ENTITY_TYPE_COLORS: Record<SearchEntityType, string> = {
  rapper:  '#e4ff1a',
  album:   '#60a5fa',
  label:   '#a78bfa',
  zanr:    '#34d399',
  skladba: '#f472b6',
  clanek:  '#fb923c',
}
