import Link from 'next/link'

interface EntityCardProps {
  title: string
  description: string
  href: string
  type: 'rapper' | 'album' | 'label' | 'zanr' | 'clanek' | 'skladba'
  meta?: string
  tags?: string[]
  featured?: boolean
}

const TYPE_COLORS = {
  rapper:  '#e4ff1a',
  album:   '#60a5fa',
  label:   '#a78bfa',
  zanr:    '#34d399',
  clanek:  '#fb923c',
  skladba: '#f472b6',
}

const TYPE_LABELS = {
  rapper:  'RAPPER',
  album:   'ALBUM',
  label:   'LABEL',
  zanr:    'ŽÁNR',
  clanek:  'ČLÁNEK',
  skladba: 'SKLADBA',
}

export function EntityCard({ title, description, href, type, meta, tags, featured }: EntityCardProps) {
  const color = TYPE_COLORS[type]
  const typeLabel = TYPE_LABELS[type]

  return (
    <Link href={href} className="block group">
      <article className="relative h-full glass glass-hover rounded-xl p-5 transition-all duration-200 group-hover:translate-y-[-1px]">
        
        {featured && (
          <div className="absolute top-3 right-3 text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded"
               style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
            Doporučeno
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] font-mono font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
                style={{ color, backgroundColor: `${color}15` }}>
            {typeLabel}
          </span>
          {meta && (
            <span className="text-xs text-zinc-600 font-mono">{meta}</span>
          )}
        </div>

        <h2 className="text-base font-bold text-zinc-100 group-hover:text-white transition-colors mb-2 leading-snug">
          {title}
        </h2>
        
        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed mb-3">
          {description}
        </p>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.filter(Boolean).slice(0, 3).map((tag, i) => (
              <span key={`${tag}-${i}`} className="text-[10px] font-mono text-zinc-600 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-sm">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center text-xs font-medium transition-colors"
             style={{ color }}>
          Zobrazit detail
          <svg className="ml-1 w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </article>
    </Link>
  )
}
