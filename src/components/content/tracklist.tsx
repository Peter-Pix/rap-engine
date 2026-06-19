"use client";

import { useState, useRef, useEffect } from "react";

interface Track {
  position: number;
  title: string;
  title_original?: string;
  duration_sec: number;
  artists: string[];
  feat: string[];
  isrc?: string | null;
  link?: string;
  preview_url?: string | null;
  explicit?: boolean;
}

interface TracklistData {
  source: string;
  source_id: number;
  release_date: string;
  label?: string | null;
  upc?: string | null;
  total_tracks: number;
  total_duration_sec: number;
  cover_xl?: string | null;
  contributors?: { name: string; role: string }[];
  genres?: string[];
  tracks: Track[];
}

interface TracklistProps {
  data: TracklistData;
  albumSlug: string;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTotalDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} hod ${m} min`;
  return `${m} min`;
}

export function Tracklist({ data, albumSlug }: TracklistProps) {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = playingIdx !== null ? data.tracks[playingIdx] : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => {
      setPlayingIdx(null);
      setProgress(0);
      // Auto-play next
      if (playingIdx !== null && playingIdx < data.tracks.length - 1) {
        setTimeout(() => setPlayingIdx(playingIdx + 1), 200);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playingIdx, data.tracks.length]);

  const playTrack = (idx: number) => {
    const track = data.tracks[idx];
    if (!track.preview_url) return;
    if (playingIdx === idx) {
      // Toggle pause
      if (audioRef.current?.paused) audioRef.current?.play();
      else audioRef.current?.pause();
    } else {
      setPlayingIdx(idx);
      setProgress(0);
    }
  };

  return (
    <section className="mt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">
          Tracklist · {data.total_tracks} skladeb · {formatTotalDuration(data.total_duration_sec)}
        </h2>
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">
          {data.release_date && <span>{data.release_date}</span>}
          {data.label && <span>· {data.label.split(" ").slice(0, 2).join(" ")}</span>}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.preview_url || undefined}
        preload="none"
      />

      {/* Track rows */}
      <ol className="divide-y divide-white/5 border-y border-white/5">
        {data.tracks.map((t, idx) => {
          const isPlaying = playingIdx === idx;
          const hasPreview = !!t.preview_url;
          return (
            <li
              key={idx}
              className={`group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded transition-colors ${
                isPlaying ? "bg-[#c8962e]/10" : "hover:bg-white/5"
              }`}
            >
              {/* Play button / position */}
              <button
                onClick={() => hasPreview && playTrack(idx)}
                disabled={!hasPreview}
                className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${
                  hasPreview
                    ? "hover:bg-[#c8962e] hover:text-black cursor-pointer"
                    : "cursor-default"
                }`}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <span className="text-[11px] font-mono text-white/40 group-hover:hidden">
                    {t.position}
                  </span>
                )}
                {!isPlaying && hasPreview && (
                  <svg className="w-3.5 h-3.5 hidden group-hover:block" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
                {!hasPreview && (
                  <span className="text-[10px] text-white/20">—</span>
                )}
              </button>

              {/* Title + feat */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-medium truncate ${isPlaying ? "text-[#c8962e]" : "text-white/90"}`}>
                    {t.title}
                  </span>
                  {t.explicit && (
                    <span className="text-[9px] font-mono px-1 py-0.5 bg-white/10 text-white/50 rounded-sm flex-shrink-0">
                      E
                    </span>
                  )}
                </div>
                {t.feat.length > 0 && (
                  <div className="text-[11px] text-white/40 truncate">
                    feat. {t.feat.join(", ")}
                  </div>
                )}
              </div>

              {/* Progress bar (only on currently playing) */}
              {isPlaying && (
                <div className="w-24 h-0.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-[#c8962e] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Deezer link */}
              {t.link && (
                <a
                  href={t.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-[#c8962e] transition-colors flex-shrink-0"
                  title="Otevřít na Deezeru"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.81 4.16a8.93 8.93 0 0 0-3.32-.69c-.86 0-1.61.31-2.13.86-.5.53-.78 1.27-.83 2.16v8.83a4.5 4.5 0 0 0-2.83-1c-2.3 0-4.5 1.7-4.5 4.5s2.2 4.5 4.5 4.5c1.7 0 3.13-.94 3.84-2.31.46-.86.66-1.79.66-2.81V8.99c0-1.18.5-1.7 1.5-1.7.42 0 .92.1 1.5.32l1.61-3.45zm-7.2 16.86c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z" />
                  </svg>
                </a>
              )}

              {/* Duration */}
              <span className="text-[11px] font-mono text-white/40 tabular-nums w-10 text-right flex-shrink-0">
                {formatDuration(t.duration_sec)}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-white/30">
        <span>Data: Deezer</span>
        {data.upc && <span>UPC: {data.upc}</span>}
      </div>
    </section>
  );
}