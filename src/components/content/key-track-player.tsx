"use client";

import { useState, useRef } from "react";

interface KeyTrackPlayerProps {
  title: string;
  /** Deezer track ID — přehráváme přes /api/preview/{id} (URL v datech expiruje). */
  deezerId: string;
  id: string;
}

export function KeyTrackPlayer({ title, deezerId, id }: KeyTrackPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    // Pause all other audio on page
    document.querySelectorAll("audio").forEach((a) => {
      if (a !== audio) a.pause();
    });

    // Deezer preview URL expiruje → vždy taháme čerstvou přes proxy.
    setLoading(true);
    audio.src = `/api/preview/${deezerId}`;
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <button
        onClick={togglePlay}
        disabled={loading}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-[#c8962e]/20 hover:bg-[#c8962e]/40 text-[#c8962e] transition-colors flex-shrink-0 disabled:opacity-50"
        aria-label={playing ? "Zastavit" : `Přehrát ${title}`}
        title={playing ? "Zastavit" : `Přehrát ${title}`}
      >
        {playing ? (
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </>
  );
}
