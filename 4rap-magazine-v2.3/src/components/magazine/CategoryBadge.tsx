import type { ReactNode } from 'react'

// ═══════════════════════════════════════════════════════════════
// CategoryBadge v2.3
//
// FIX v2.3:
//   • NewBadge je teď rounded-full (jako ostatní kategorie)
//   • Menší font (9px), menší padding
//   • Subtle (žlutá 70% opacity, ne plná) — indikátor, ne CTA
// ═══════════════════════════════════════════════════════════════

export type CategoryKey =
  | 'featured'
  | 'rapeřri'
  | 'raperi'
  | 'alba'
  | 'labely'
  | 'zanry'
  | 'clanky'
  | 'navody'
  | 'rozhovor'
  | 'recenze'
  | 'historie'
  | 'analyza'
  | 'editorial'

interface CategoryStyle {
  bg: string
  text: string
  ring: string
  dot: string
  label: string
}

const STYLES: Record<string, CategoryStyle> = {
  featured: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-400',
    label: '★ FEATURED',
  },
  raperi: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-400',
    label: 'RAPEŘI',
  },
  alba: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    ring: 'ring-sky-500/25',
    dot: 'bg-sky-400',
    label: 'ALBA',
  },
  labely: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    ring: 'ring-violet-500/25',
    dot: 'bg-violet-400',
    label: 'LABELY',
  },
  zanry: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-400',
    label: 'ŽÁNRY',
  },
  clanky: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    ring: 'ring-violet-500/25',
    dot: 'bg-violet-400',
    label: 'ČLÁNKY',
  },
  navody: {
    bg: 'bg-pink-500/15',
    text: 'text-pink-300',
    ring: 'ring-pink-500/25',
    dot: 'bg-pink-400',
    label: 'NÁVODY',
  },
  rozhovor: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-300',
    ring: 'ring-cyan-500/25',
    dot: 'bg-cyan-400',
    label: 'ROZHOVOR',
  },
  recenze: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-300',
    ring: 'ring-orange-500/25',
    dot: 'bg-orange-400',
    label: 'RECENZE',
  },
  historie: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    ring: 'ring-amber-500/25',
    dot: 'bg-amber-400',
    label: 'HISTORIE',
  },
  analyza: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-300',
    ring: 'ring-violet-500/25',
    dot: 'bg-violet-400',
    label: 'ANALÝZA',
  },
  editorial: {
    bg: 'bg-zinc-500/15',
    text: 'text-zinc-300',
    ring: 'ring-zinc-500/25',
    dot: 'bg-zinc-400',
    label: 'EDITORIAL',
  },
}

const FALLBACK: CategoryStyle = STYLES.editorial

export function categoryKey(raw: string | undefined | null): string {
  if (!raw) return 'editorial'
  const n = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (n.includes('rape')) return 'raperi'
  if (n.includes('alb')) return 'alba'
  if (n.includes('label')) return 'labely'
  if (n.includes('zan') || n.includes('zánr')) return 'zanry'
  if (n.includes('navod') || n.includes('guide') || n.includes('jak')) return 'navody'
  if (n.includes('recen')) return 'recenze'
  if (n.includes('rozhov') || n.includes('interview')) return 'rozhovor'
  if (n.includes('histor')) return 'historie'
  if (n.includes('analy')) return 'analyza'
  if (n.includes('clane') || n.includes('clánk') || n.includes('članek')) return 'clanky'
  return 'editorial'
}

export function getCategoryStyle(category: string): CategoryStyle {
  return STYLES[categoryKey(category)] ?? FALLBACK
}

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

export function CategoryDotLabel({ category, className = '' }: { category: string; className?: string }) {
  const s = getCategoryStyle(category)
  return (
    <span className={['inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest', s.text, className].join(' ')}>
      <span className={['w-1.5 h-1.5 rounded-full', s.dot].join(' ')} aria-hidden />
      {s.label}
    </span>
  )
}

/**
 * NEW badge v2.3 — rounded-full, menší, méně agresivní.
 * Žlutá zachovává viditelnost, ale opacity ji utlumuje.
 */
export function NewBadge({ className = '' }: { className?: string }) {
  return (
    <span className={[
      'inline-flex items-center px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest',
      'bg-[#e4ff1a]/90 text-zinc-950 rounded-full',
      className,
    ].join(' ')}>
      NEW
    </span>
  )
}
