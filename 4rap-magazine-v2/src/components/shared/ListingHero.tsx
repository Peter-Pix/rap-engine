import type { ReactNode } from 'react'

// ═══════════════════════════════════════════════════════════════
// ListingHero — header pro listing pages
//
// Layout:
//   [kategorie pillula]
//   BIG UPPERCASE TITLE
//   subtitle / popis (1 řádek)
//   meta: "N rapperů · žánrů · labelů" + volitelné akce
//
// Magazín estetika: bold typography, tighter tracking, accent color.
// Responsive: mobile font ~3xl, desktop 5xl-6xl.
// ═══════════════════════════════════════════════════════════════

interface ListingHeroProps {
  /** Kategorie/sekce label (např. "Databáze", "Magazín") */
  kicker?: string
  /** Barva kickeru — default lime accent */
  kickerColor?: string
  title: string
  description?: string
  /** Pravá strana — typicky "X rapperů · Y labelů" nebo akce */
  meta?: ReactNode
  className?: string
}

export function ListingHero({
  kicker,
  kickerColor = '#e4ff1a',
  title,
  description,
  meta,
  className = '',
}: ListingHeroProps) {
  return (
    <header className={['mb-8 sm:mb-12', className].join(' ')}>
      {kicker && (
        <p
          className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest mb-4"
          style={{ color: kickerColor }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: kickerColor }} aria-hidden />
          {kicker}
        </p>
      )}

      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white uppercase leading-[0.95] mb-4">
        {title}
      </h1>

      {description && (
        <p className="text-base sm:text-lg text-zinc-400 max-w-3xl leading-relaxed">
          {description}
        </p>
      )}

      {meta && (
        <div className="mt-6 flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-zinc-500">
          {meta}
        </div>
      )}
    </header>
  )
}

// ─── StatsBar — kompaktní stats pod hero ────────────────────────

interface StatItem {
  label: string
  value: number | string
  /** Volitelný accent pro hodnotu */
  color?: string
}

interface StatsBarProps {
  items: StatItem[]
  className?: string
}

export function StatsBar({ items, className = '' }: StatsBarProps) {
  return (
    <div className={['flex flex-wrap gap-x-6 gap-y-3', className].join(' ')}>
      {items.map((stat) => (
        <div key={stat.label} className="flex items-baseline gap-2">
          <span
            className="font-mono font-black text-base"
            style={{ color: stat.color ?? '#e4ff1a' }}
          >
            {stat.value}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── EmptyState — pro zero-results ──────────────────────────────

interface EmptyStateProps {
  title: string
  description?: string
  children?: ReactNode
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06] p-12 sm:p-16 text-center">
      <p className="text-base font-bold text-zinc-300 mb-2">{title}</p>
      {description && (
        <p className="text-sm text-zinc-500 mb-4">{description}</p>
      )}
      {children}
    </div>
  )
}
