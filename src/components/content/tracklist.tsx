"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { extractDeezerTrackId } from "@/lib/content/deezer-helpers";

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
  /** Mapa: pozice v tracklistu → naše track route (/skladby/<slug>). */
  trackRoutes?: Record<string, string>;
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


/** Normalizace tracklistu z různých zdrojů (Deezer / Discogs / Wikipedia).
 *  Discogs: {title, position, duration:"3:45"}, bez feat/artists/duration_sec.
 *  Deezer:  {title, duration_sec, artists, feat, preview_url, ...}. */
function normalizeTracklist(data: any): TracklistData {
  const raw: any[] = Array.isArray(data?.tracks) ? data.tracks : [];
  const tracks: Track[] = raw.map((t, i) => {
    // duration: "3:45" → 225 s | číslo = sekundy
    let dur = 0;
    if (typeof t?.duration_sec === "number") dur = t.duration_sec;
    else if (typeof t?.duration === "number") dur = t.duration;
    else if (typeof t?.duration === "string" && t.duration.includes(":")) {
      const p = t.duration.split(":").map((x: string) => parseInt(x, 10) || 0);
      dur = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : (p[0] || 0) * 60 + (p[1] || 0);
    }
    return {
      position: typeof t?.position === "number" ? t.position : (parseInt(t?.position, 10) || i + 1),
      title: String(t?.title ?? "—"),
      title_original: t?.title_original,
      duration_sec: dur,
      artists: Array.isArray(t?.artists) ? t.artists : [],
      feat: Array.isArray(t?.feat) ? t.feat : [],
      isrc: t?.isrc ?? null,
      link: t?.link,
      preview_url: t?.preview_url ?? null,
      explicit: t?.explicit,
    };
  });
  const totalDur = tracks.reduce((a, t) => a + (t.duration_sec || 0), 0);
  return {
    source: String(data?.source ?? "unknown"),
    source_id: Number(data?.source_id ?? data?.sourceId ?? 0),
    release_date: String(data?.release_date ?? ""),
    label: data?.label ?? null,
    upc: data?.upc ?? null,
    total_tracks: typeof data?.total_tracks === "number" ? data.total_tracks : tracks.length,
    total_duration_sec: typeof data?.total_duration_sec === "number" ? data.total_duration_sec : totalDur,
    cover_xl: data?.cover_xl ?? null,
    contributors: data?.contributors,
    genres: data?.genres,
    tracks,
  };
}

export function Tracklist({ data, albumSlug, trackRoutes = {} }: TracklistProps) {
  const d = normalizeTracklist(data);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnd = () => {
      setPlayingIdx(null);
      setLoadingIdx(null);
      setProgress(0);
    };
    const onPause = () => setPlayingIdx(null);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingIdx(null);
    setLoadingIdx(null);
    setProgress(0);
  }, []);

  const playTrack = useCallback(
    (idx: number) => {
      const audio = audioRef.current;
      const track = d.tracks[idx];
      if (!audio || !track) return;

      if (playingIdx === idx) {
        stop();
        return;
      }

      const deezerId = extractDeezerTrackId(track.link);

      document.querySelectorAll("audio").forEach((a) => {
        if (a !== audio) a.pause();
      });

      setLoadingIdx(idx);
      setPlayingIdx(idx);
      setProgress(0);

      audio.src = deezerId ? `/api/preview/${deezerId}` : track.preview_url || "";
      audio
        .play()
        .then(() => setLoadingIdx(null))
        .catch(() => {
          setLoadingIdx(null);
          setPlayingIdx(null);
        });
    },
    [d.tracks, playingIdx, stop],
  );

  return (
    <section className="mt-12">
      <audio ref={audioRef} preload="none" />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/40">
          Tracklist · {d.total_tracks} skladeb · {formatTotalDuration(d.total_duration_sec)}
        </h2>
        <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.15em] text-white/30">
          {d.release_date && <span>{d.release_date}</span>}
          {d.label && <span>· {d.label.split(" ").slice(0, 2).join(" ")}</span>}
        </div>
      </div>

      <ol className="divide-y divide-white/5 border-y border-white/5">
        {d.tracks.map((t, idx) => {
          const isPlaying = playingIdx === idx;
          const isLoading = loadingIdx === idx;
          const hasDeezer = !!extractDeezerTrackId(t.link);
          const hasAny = hasDeezer || !!t.preview_url;
          const route = trackRoutes[String(t.position)];
          return (
            <li
              key={idx}
              className={`group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded transition-colors ${
                isPlaying ? "bg-[#c8962e]/10" : "hover:bg-white/5"
              }`}
            >
              <button
                onClick={() => hasAny && playTrack(idx)}
                disabled={!hasAny}
                className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${
                  hasAny ? "hover:bg-[#c8962e] hover:text-black cursor-pointer" : "cursor-default"
                }`}
                aria-label={isPlaying ? "Zastavit" : `Přehrát ${t.title}`}
                title={hasAny ? (isPlaying ? "Zastavit" : "Přehrát 30s ukázku") : "Bez ukázky"}
              >
                {isLoading ? (
                  <svg className="w-3.5 h-3.5 animate-spin text-[#c8962e]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                  </svg>
                ) : isPlaying ? (
                  <svg className="w-3.5 h-3.5 text-[#c8962e]" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <>
                    <span className="text-[11px] font-mono text-white/40 group-hover:hidden">
                      {t.position}
                    </span>
                    {hasAny && (
                      <svg className="w-3.5 h-3.5 hidden group-hover:block" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                    {!hasAny && <span className="text-[11px] text-white/20">—</span>}
                  </>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  {route ? (
                    <a
                      href={route}
                      className={`text-sm font-medium truncate transition-colors ${
                        isPlaying ? "text-[#c8962e]" : "text-white/90 hover:text-[#c8962e]"
                      }`}
                    >
                      {t.title}
                    </a>
                  ) : (
                    <span className={`text-sm font-medium truncate ${isPlaying ? "text-[#c8962e]" : "text-white/90"}`}>
                      {t.title}
                    </span>
                  )}
                  {t.explicit && (
                    <span className="text-[11px] font-mono px-1 py-0.5 bg-white/10 text-white/50 rounded-sm flex-shrink-0">
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

              {isPlaying && !isLoading && (
                <div className="w-24 h-0.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-[#c8962e] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

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

              <span className="text-[11px] font-mono text-white/40 tabular-nums w-10 text-right flex-shrink-0">
                {formatDuration(t.duration_sec)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-white/30">
        <span>Data: Deezer</span>
        {d.upc && <span>UPC: {d.upc}</span>}
      </div>
    </section>
  );
}
