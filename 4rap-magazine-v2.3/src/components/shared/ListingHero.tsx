import type { ReactNode } from 'react'

// ═══════════════════════════════════════════════════════════════
// ListingHero v2.3 — diakritika-safe + downscaled na desktop
//
// FIX v2.3: stejný typography pattern jako DetailHero
//   • Mobile 26px → tablet 32px → md 40px → lg 48px
//   • Line-height ≥1.05 napříč
// ═══════════════════════════════════════════════════════════════

interface ListingHeroProps {
  kicker?: string
  kickerColor?: string
  title: string
  description?: string
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
          className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest mb-3 sm:mb-4"
          style={{ color: kickerColor }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: kickerColor }} aria-hidden />
          {kicker}
        </p>
      )}

      <h1
        className="cz-display font-black uppercase text-white mb-3 sm:mb-4
                   text-[1.625rem] leading-[1.1]
                   sm:text-3xl sm:leading-[1.08] sm:tracking-tight
                   md:text-4xl md:leading-[1.06]
                   lg:text-5xl lg:leading-[1.05] lg:tracking-tight
                   text-balance hyphens-none"
      >
        {title}
      </h1>

      {description && (
        <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-3xl leading-relaxed">
          {description}
        </p>
      )}

      {meta && (
        <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-widest text-zinc-500">
          {meta}
        </div>
      )}
    </header>
  )
}

interface StatItem {
  label: string
  value: number | string
  color?: string
}

interface StatsBarProps {
  items: StatItem[]
  className?: string
}

export function StatsBar({ items, className = '' }: StatsBarProps) {
  return (
    <div className={['flex flex-wrap gap-x-5 sm:gap-x-6 gap-y-2', className].join(' ')}>
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

interface EmptyStateProps {
  title: string
  description?: string
  children?: ReactNode
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.06] p-8 sm:p-16 text-center">
      <p className="text-base font-bold text-zinc-300 mb-2">{title}</p>
      {description && (
        <p className="text-sm text-zinc-500 mb-4">{description}</p>
      )}
      {children}
    </div>
  )
}
