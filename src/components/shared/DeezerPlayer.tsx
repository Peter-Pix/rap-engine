'use client'

import { useEffect, useRef, useState } from 'react'

// ═══════════════════════════════════════════════════════════════
// DeezerPlayer — 30sec preview player pro skladby
//
// Použití:
//   <DeezerPlayer trackId={123456789} title="Název skladby" />
//
// Funkce:
//   ● Načte 30sec preview z Deezer API (public endpoint)
//   ● Autoplay po kliknutí (s kontrolou, zda uživatel interagoval s page)
//   ● Progress bar, play/pause, čas
//   ● Responzivní design
//   ● Fallback na placeholder, pokud trackId není zadán
// ═══════════════════════════════════════════════════════════════

interface DeezerPlayerProps {
  trackId?: number | null
  title?: string
  artist?: string
  image?: string
}

export function DeezerPlayer({ trackId, title, artist, image }: DeezerPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(30) // Deezer preview = 30 sec
  const [hasInteracted, setHasInteracted] = useState(false)

  // Deezer preview URL
  const previewUrl = trackId
    ? `https://cdns-preview-${trackId % 9}.dzcdn.net/stream/c-${trackId}-0-30s.mp3`
    : null

  // Handle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return
    if (!hasInteracted) setHasInteracted(true)
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Update progress
  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setProgress(audioRef.current.currentTime)
  }

  // Handle end
  const handleEnded = () => {
    setIsPlaying(false)
    setProgress(0)
  }

  // Reset on trackId change
  useEffect(() => {
    setIsPlaying(false)
    setProgress(0)
  }, [trackId])

  return (
    <div className="rounded-xl bg-zinc-900/50 ring-1 ring-white/10 p-4 flex items-center gap-4">
      {/* Cover */}
      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
        {image ? (
          <img
            src={image}
            alt={`${title} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info + Controls */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {title || 'Neznámá skladba'}
            </h3>
            <p className="text-xs text-zinc-400 truncate">
              {artist || 'Neznámý interpret'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500 w-8 text-right">
            {Math.floor(progress)}s
          </span>
          <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${(progress / duration) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-zinc-500 w-8">
            {duration}s
          </span>
        </div>
      </div>

      {/* Audio element */}
      {previewUrl && hasInteracted && (
        <audio
          ref={audioRef}
          src={previewUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 30)}
        />
      )}
    </div>
  )
}