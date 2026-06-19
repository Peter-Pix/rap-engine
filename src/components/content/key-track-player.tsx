"use client";

import { useState, useRef } from "react";

interface KeyTrackPlayerProps {
  title: string;
  previewUrl: string;
  id: string;
}

export function KeyTrackPlayer({ title, previewUrl, id }: KeyTrackPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      // Pause all other audio on page
      document.querySelectorAll("audio").forEach((a) => {
        if (a !== audio) {
          a.pause();
        }
      });
      audio.play().catch(() => {
        setPlaying(false);
      });
      setPlaying(true);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="none"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <button
        onClick={togglePlay}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-[#c8962e]/20 hover:bg-[#c8962e]/40 text-[#c8962e] transition-colors flex-shrink-0"
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