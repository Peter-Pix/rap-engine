// ═══════════════════════════════════════════════════════════════
// RAPENGINE — Entity Registry
//
// Master seznam všech entit pro auto-interlinking.
// Plugin remark-interlinking.ts z tohoto čte při build time.
//
// Pravidla pro přidávání:
// - name = display jméno (jak se zobrazí v textu)
// - slug = URL slug (lowercase, pomlčky)
// - aliases = alternativní názvy (občanské jméno, zkratky)
// - caseSensitive: false jen pro generické pojmy (žánry)
// ═══════════════════════════════════════════════════════════════

import type { InterlinkEntity } from './remark-interlinking'

export const ENTITY_REGISTRY: InterlinkEntity[] = [
  // ─── RAPPEŘI ──────────────────────────────────────────────
  { name: 'Yzomandias',       slug: 'yzomandias',       type: 'rapper', aliases: ['Jakub Vlček'] },
  { name: 'Gleb',             slug: 'gleb',             type: 'rapper', aliases: ['Gleb Prigožin'] },
  { name: 'Calin',            slug: 'calin',            type: 'rapper', aliases: ['Călin Panfili'] },
  { name: 'Paulie Garand',    slug: 'paulie-garand',    type: 'rapper', aliases: ['Pavel Harant'] },
  { name: 'Marpo',            slug: 'marpo',            type: 'rapper', aliases: ['Otakar Petřina'] },
  { name: 'Kato',             slug: 'kato',             type: 'rapper', aliases: ['Adam Svatoš'] },
  { name: 'Idea',             slug: 'idea',             type: 'rapper', aliases: ['Josef Změlík'] },
  { name: 'Orion',            slug: 'orion',            type: 'rapper', aliases: ['Michal Opletal'] },
  { name: 'Vladimír 518',     slug: 'vladimir-518',     type: 'rapper', aliases: ['Vladimír Brož'] },
  { name: 'Rest',             slug: 'rest',             type: 'rapper', aliases: ['Adam Chlpík'] },
  { name: 'Sergei Barracuda', slug: 'sergei-barracuda', type: 'rapper', aliases: ['Erik Peter'] },
  { name: 'Viktor Sheen',     slug: 'viktor-sheen',     type: 'rapper', aliases: ['Viktor Dundych', 'BUKA'] },
  { name: 'Lipo',             slug: 'lipo',             type: 'rapper', aliases: ['Jonáš Červinka'] },
  { name: 'Indy',             slug: 'indy',             type: 'rapper', aliases: ['Andreas Christodoulou'] },
  { name: 'SharkaSs',         slug: 'sharkass',         type: 'rapper', aliases: ['Šárka Geroldová'] },
  { name: 'Separ',            slug: 'separ',            type: 'rapper', aliases: ['Juraj Šefčík'] },

  // ─── LABELY ───────────────────────────────────────────────
  { name: 'Milion+',           slug: 'milion-plus',       type: 'label', aliases: ['Milion Plus'] },
  { name: 'Blakkwood Records', slug: 'blakkwood-records', type: 'label', aliases: ['Blakkwood'] },

  // ─── ŽÁNRY ────────────────────────────────────────────────
  // case-insensitive: "drill"/"Drill"/"DRILL" se všechny matchnou
  { name: 'drill',     slug: 'drill',     type: 'zanr', caseSensitive: false },
  { name: 'boom bap',  slug: 'boom-bap',  type: 'zanr', caseSensitive: false },
]

// Helper pro statistiku / debug
export function getRegistryStats() {
  const byType = ENTITY_REGISTRY.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {})
  return {
    total: ENTITY_REGISTRY.length,
    byType,
    totalAliases: ENTITY_REGISTRY.reduce((sum, e) => sum + (e.aliases?.length || 0), 0),
  }
}
