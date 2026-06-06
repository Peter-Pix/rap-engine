'use client'

import { useRef, useState } from 'react'

type Props = {
  deezerId?: number | string | null
  /** volitelně rovnou známý odkaz (může být prošlý) — primárně se použije API routa */
  previewUrl?: string | null
  duration?: string | null // "3:14"
}

// 30s preview přehrávač. Odkaz tahá čerstvý přes /api/track-preview/<id> (řeší expiraci).
export function PreviewPlayer({ deezerId, previewUrl, duration }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')

  if (!deezerId && !previewUrl) return null

  async function toggle() {
    const audio = audioRef.current
    if (audio && !audio.paused) { audio.pause(); setState('idle'); return }

    // BUG-03 fix: release previous Audio before creating new one
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }

    setState('loading')
    let src = previewUrl || null
    if (deezerId) {
      try {
        const r = await fetch(`/api/track-preview/${deezerId}`)
        if (r.ok) src = (await r.json()).preview
      } catch { /* fallback na previewUrl níže */ }
    }
    if (!src) { setState('error'); return }

    const a = new Audio(src)
    audioRef.current = a
    a.onended = () => { setState('idle'); audioRef.current = null }
    a.onerror = () => { setState('error'); audioRef.current = null }
    try { await a.play(); setState('playing') } catch { setState('error'); audioRef.current = null }
  }

  return (
    <button
      onClick={toggle}
      aria-label={state === 'playing' ? 'Zastavit ukázku' : 'Přehrát 30s ukázku'}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-50"
      disabled={state === 'loading'}
    >
      <span aria-hidden>
        {state === 'playing' ? '❚❚' : state === 'loading' ? '…' : '▶'}
      </span>
      <span>{state === 'error' ? 'Ukázka nedostupná' : 'Ukázka 30 s'}</span>
      {duration && <span className="text-zinc-500">{duration}</span>}
    </button>
  )
}
