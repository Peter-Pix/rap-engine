import type { ReactNode } from 'react'

// ═══════════════════════════════════════════════════════════════
// CategoryBadge — barevná pilulka označující kategorii článku
//
// Barvy navazují na existující entity-link paletu (globals.css):
//   rapper  → lime  (#e4ff1a) - accent celé stránky
//   album   → modrá (#60a5fa)
//   label   → fial. (#a78bfa)
//   zanr    → zel.  (#34d399)
//
// Kategorie pro články (magazín):
//   featured → zelená  — hlavní hero label
//   profil   → modrá   — profily interpretů
//   historie → amber   — historie scény
//   analyza  → fialová — analýzy, eseje
//   editorial→ šedá    — názory, komentáře
//   navody   → růžová  — DIY, how-to, tutoriály
//   recenze  → orange  — album/track recenze
//   rozhovor → cyan    — interviews
//   novinky  → žlutá   — zprávy, aktuality
// ═══════════════════════════════════════════════════════════════

/** Kategorie pro feed článků — pouze magazínové typy, ne entitní typy */
export const ARTICLE_CATEGORIES = [
  'profil', 'navody', 'recenze', 'rozhovor', 'historie', 'analyza', 'editorial', 'novinky',
] as const

/** Všechny kategorie včetně entitních typů — pro badge rendering */
export const ALL_CATEGORIES = [
  'raperi', 'alba', 'labely', 'zanry', 'clanky',
  ...ARTICLE_CATEGORIES,
] as const

export type CategoryKey = typeof ALL_CATEGORIES[number] | 'featured'
export type ArticleCategory = typeof ARTICLE_CATEGORIES[number]

interface CategoryStyle {
  bg: string
  text: string
  ring: string
  dot: string
  label: string
  description: string
}

const STYLES: Record<string, CategoryStyle> = {
  featured: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-400',
    label: '★ FEATURED',
    description: 'Redakční výběr — článek dne',
  },
  raperi: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-400',
    label: 'RAPEŘI',
    description: 'Databáze českých a slovenských rapperů',
  },
  alba: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    ring: 'ring-sky-500/25',
    dot: 'bg-sky-400',
    label: 'ALBA',
    description: 'Diskografie, tracklisty, kontext',
  },
  labely: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    ring: 'ring-violet-500/25',
    dot: 'bg-violet-400',
    label: 'LABELY',
    description: 'Vydavatelství a jejich katalogy',
  },
  zanry: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-400',
    label: 'ŽÁNRY',
    description: 'Hudební styly, subžánry, vlivy',
  },
  clanky: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    ring: 'ring-violet-500/25',
    dot: 'bg-violet-400',
    label: 'ČLÁNKY',
    description: 'Obecné články bez specifické kategorie',
  },
  // ─── Magazínové kategorie ───
  profil: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    ring: 'ring-sky-500/25',
    dot: 'bg-sky-400',
    label: 'PROFIL',
    description: 'Hloubkový profil osobnosti — kariéra, vliv, styl',
  },
  navody: {
    bg: 'bg-pink-500/15',
    text: 'text-pink-300',
    ring: 'ring-pink-500/25',
    dot: 'bg-pink-400',
    label: 'NÁVODY',
    description: 'DIY, tutoriály, praktické postupy',
  },
  recenze: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-300',
    ring: 'ring-orange-500/25',
    dot: 'bg-orange-400',
    label: 'RECENZE',
    description: 'Recenze alb, EP, tracků, koncertů',
  },
  rozhovor: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    ring: 'ring-cyan-500/25',
    dot: 'bg-cyan-400',
    label: 'ROZHOVOR',
    description: 'Rozhovory s osobnostmi scény',
  },
  historie: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    ring: 'ring-amber-500/25',
    dot: 'bg-amber-400',
    label: 'HISTORIE',
    description: 'Historie scény, žánrů, událostí',
  },
  analyza: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    ring: 'ring-violet-500/25',
    dot: 'bg-violet-400',
    label: 'ANALÝZA',
    description: 'Analýzy trendů, dat, fenoménů',
  },
  editorial: {
    bg: 'bg-zinc-500/15',
    text: 'text-zinc-300',
    ring: 'ring-zinc-500/25',
    dot: 'bg-zinc-400',
    label: 'EDITORIAL',
    description: 'Názory, komentáře, úvahy o scéně',
  },
  novinky: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-300',
    ring: 'ring-yellow-500/25',
    dot: 'bg-yellow-400',
    label: 'NOVINKY',
    description: 'Aktuality, zprávy, oznámení ze scény',
  },
}

const FALLBACK: CategoryStyle = STYLES.editorial

/** Normalize category string from MDX frontmatter to lookup key. */
export function categoryKey(raw: string | undefined | null): string {
  if (!raw) return 'editorial'
  const n = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (n.includes('profil') || n.includes('portret') || n.includes('medailonek')) return 'profil'
  if (n.includes('navod') || n.includes('guide') || n.includes('jak') || n.includes('tutorial')) return 'navody'
  if (n.includes('recen')) return 'recenze'
  if (n.includes('rozhov') || n.includes('interview')) return 'rozhovor'
  if (n.includes('histor') || n.includes('dejin')) return 'historie'
  if (n.includes('analy') || n.includes('trend') || n.includes('fenomen')) return 'analyza'
  if (n.includes('editorial') || n.includes('nazor') || n.includes('komentar')) return 'editorial'
  if (n.includes('novink') || n.includes('zprav') || n.includes('aktual')) return 'novinky'
  if (n.includes('rape')) return 'raperi'
  if (n.includes('alb')) return 'alba'
  if (n.includes('label')) return 'labely'
  if (n.includes('zan') || n.includes('zánr')) return 'zanry'
  if (n.includes('clane') || n.includes('clánk') || n.includes('članek')) return 'clanky'
  return 'editorial'
}

export function getCategoryStyle(category: string): CategoryStyle {
  return STYLES[categoryKey(category)] ?? FALLBACK
}

// ─── COMPONENTS ────────────────────────────────────────────────

interface BadgeProps {
  category: string
  variant?: 'solid' | 'dot'
  size?: 'sm' | 'md'
  className?: string
  children?: ReactNode
}

export function CategoryBadge({ category, variant = 'solid', size = 'sm', className = '', children }: BadgeProps) {
  const s = getCategoryStyle(category)
  const sizeCls = size === 'md' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[10px]'

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-widest rounded-full ring-1',
        s.bg, s.text, s.ring, sizeCls, className,
      ].join(' ')}
    >
      {variant === 'dot' && <span className={['w-1.5 h-1.5 rounded-full', s.dot].join(' ')} aria-hidden />}
      {children ?? s.label}
    </span>
  )
}

/** Smaller dotted variant — pro trending sidebar */
export function CategoryDotLabel({ category, className = '' }: { category: string; className?: string }) {
  const s = getCategoryStyle(category)
  return (
    <span className={['inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest', s.text, className].join(' ')}>
      <span className={['w-1.5 h-1.5 rounded-full', s.dot].join(' ')} aria-hidden />
      {s.label}
    </span>
  )
}

/** Yellow "NEW" pill — articles within last 14 days */
export function NewBadge({ className = '' }: { className?: string }) {
  return (
    <span className={[
      'inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-widest',
      'bg-[#e4ff1a] text-zinc-950 rounded',
      className,
    ].join(' ')}>
      NEW
    </span>
  )
}
