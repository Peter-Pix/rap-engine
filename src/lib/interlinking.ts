// ═══════════════════════════════════════════════════════════
// RAPENGINE — Auto-Interlinking Engine
// Prohledá MDX obsah a automaticky linkuje entity
// "Gleb" → <a href="/raperi/gleb">Gleb</a>
// ═══════════════════════════════════════════════════════════

export interface InterlinkerEntity {
  name: string
  slug: string
  type: 'rapper' | 'album' | 'label' | 'zanr'
  aliases?: string[]
}

// ─── MASTER ENTITY REGISTRY ──────────────────────────────
// Toto se bude automaticky generovat z content souborů
export const ENTITY_REGISTRY: InterlinkerEntity[] = [
  // Rappeři
  { name: 'Gleb', slug: 'gleb', type: 'rapper', aliases: ['Gleb Prigožin'] },
  { name: 'Yzomandias', slug: 'yzomandias', type: 'rapper' },
  { name: 'Calin', slug: 'calin', type: 'rapper' },
  { name: 'PSH', slug: 'psh', type: 'rapper', aliases: ['Prago Union', 'Hugo Toxxx', 'Orion'] },
  { name: 'Řezník', slug: 'reznik', type: 'rapper' },
  { name: 'Hellwana', slug: 'hellwana', type: 'rapper' },
  { name: 'Ektor', slug: 'ektor', type: 'rapper' },
  { name: 'Separ', slug: 'separ', type: 'rapper' },
  { name: 'Paulie Garand', slug: 'paulie-garand', type: 'rapper' },
  { name: 'Majk Spirit', slug: 'majk-spirit', type: 'rapper' },
  { name: 'Kontrafakt', slug: 'kontrafakt', type: 'rapper' },
  // Labely
  { name: 'Milion+', slug: 'milion-plus', type: 'label', aliases: ['Milion Plus'] },
  { name: 'Ty Nikdy', slug: 'ty-nikdy', type: 'label' },
  { name: 'Universal Music', slug: 'universal-music', type: 'label' },
  // Žánry
  { name: 'UK garage', slug: 'uk-garage', type: 'zanr' },
  { name: 'drill', slug: 'drill', type: 'zanr' },
  { name: 'trap', slug: 'trap', type: 'zanr' },
  { name: 'boom bap', slug: 'boom-bap', type: 'zanr' },
  { name: 'grime', slug: 'grime', type: 'zanr' },
]

// ─── URL MAPA ────────────────────────────────────────────
const TYPE_TO_PATH: Record<InterlinkerEntity['type'], string> = {
  rapper: '/raperi',
  album:  '/alba',
  label:  '/labely',
  zanr:   '/zanry',
}

// ─── HLAVNÍ INTERLINKING FUNKCE ──────────────────────────
// Prochází MDX body text a vkládá hyperlinky
// Používá se při buildu, ne za runtime
export function autoInterlink(
  text: string,
  currentSlug?: string,
  currentType?: string
): string {
  let result = text
  
  // Seřadit podle délky (delší aliasy první = správnější matchování)
  const sorted = [...ENTITY_REGISTRY].sort(
    (a, b) => (b.aliases?.[0]?.length || b.name.length) - (a.aliases?.[0]?.length || a.name.length)
  )
  
  for (const entity of sorted) {
    // Přeskočit self-reference
    if (entity.slug === currentSlug && entity.type === currentType) continue
    
    const names = [entity.name, ...(entity.aliases || [])]
    const basePath = TYPE_TO_PATH[entity.type]
    const href = `${basePath}/${entity.slug}`
    
    for (const name of names) {
      // Escapovat spec. znaky pro regex
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Word boundary matching — nechceme linkovat uvnitř jiných slov
      const regex = new RegExp(`(?<!href=")(?<!<a[^>]*>)\\b(${escaped})\\b(?![^<]*<\\/a>)`, 'g')
      result = result.replace(regex, `<a href="${href}" class="entity-link entity-link--${entity.type}">$1</a>`)
    }
  }
  
  return result
}

// ─── EXTRAKCE ZMÍNĚNÝCH ENTIT ────────────────────────────
// Pro každý artikel vrátí seznam entit, které zmiňuje
// Používá se pro generování "Zmínění v článcích" sekcí
export function extractMentionedEntities(text: string): InterlinkerEntity[] {
  const mentioned: InterlinkerEntity[] = []
  
  for (const entity of ENTITY_REGISTRY) {
    const names = [entity.name, ...(entity.aliases || [])]
    const found = names.some(name => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
    })
    if (found) mentioned.push(entity)
  }
  
  return mentioned
}

// ─── GENERATE ENTITY REGISTRY ────────────────────────────
// Tato funkce se spustí při buildu a aktualizuje registry
// z aktuálních content souborů (budoucí implementace)
export async function generateEntityRegistry(): Promise<void> {
  // TODO: Fáze 3 — číst z content/ a generovat ENTITY_REGISTRY automaticky
  console.log('[RapEngine] Entity registry loaded:', ENTITY_REGISTRY.length, 'entities')
}
