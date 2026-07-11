/*
 * YouTube Embed Component for 4rap.cz
 *
 * Features:
 * - Lazy loading with Intersection Observer
 * - Responsive 16:9 aspect ratio
 * - Placeholder with thumbnail + play button
 * - YouTube IFrame API (better performance than raw iframe)
 * - Fallback to thumbnail if embed fails
 */

"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  namespace YT {
    class Player {
      constructor(
        container: HTMLElement | null,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onError?: (event: { data: number }) => void;
          };
        },
      );
      destroy(): void;
    }
  }
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YoutubeEmbedProps = {
  videoId: string;
  lazyLoad?: boolean;
};

export default function YoutubeEmbed({ videoId, lazyLoad = true }: YoutubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!lazyLoad);
  const [hasError, setHasError] = useState(false);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (!lazyLoad || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [lazyLoad]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!isVisible || !videoId || hasError) return;

    let player: YT.Player;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);

    window.onYouTubeIframeAPIReady = () => {
      player = new YT.Player(containerRef.current!, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0, // No related videos
          modestbranding: 1, // Small YouTube logo
        },
        events: {
          onError: () => setHasError(true),
        },
      });
    };

    return () => {
      if (player) player.destroy();
      document.body.removeChild(script);
    };
  }, [isVisible, videoId, hasError]);

  if (!videoId) {
    return null;
  }

  if (hasError) {
    return <YoutubeFallback videoId={videoId} />;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
    >
      {!isVisible && <YoutubePlaceholder videoId={videoId} />}
      <div
        id="youtube-player"
        className={`w-full h-full ${!isVisible ? "hidden" : "block"}`}
      />
    </div>
  );
}

// Placeholder with thumbnail + play button
function YoutubePlaceholder({ videoId }: { videoId: string }) {
  return (
    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt="YouTube thumbnail"
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }}
      />
      <div className="relative z-10 bg-black bg-opacity-50 p-4 rounded-full">
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

// Fallback to thumbnail if embed fails
function YoutubeFallback({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt="YouTube thumbnail"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <a
          href={`https://youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Přehrát na YouTube
        </a>
      </div>
    </div>
  );
}