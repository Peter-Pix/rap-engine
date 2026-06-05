'use client'
import { useEffect } from 'react'
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[label-detail] error:', error) }, [error])
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 text-center">
      <div className="glass rounded-2xl p-12 max-w-lg mx-auto">
        <p className="text-sm font-mono uppercase tracking-widest text-red-400 mb-4">Chyba při načítání</p>
        <p className="text-zinc-400 text-sm mb-6">Nepodařilo se načíst label.</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="px-4 py-2 rounded-lg bg-[#e4ff1a] text-zinc-950 text-sm font-bold hover:bg-white transition-colors">Zkusit znovu</button>
          <a href="/labely" className="px-4 py-2 rounded-lg bg-white/[0.06] ring-1 ring-white/10 text-zinc-300 text-sm">Všechny labely →</a>
        </div>
      </div>
    </div>
  )
}
