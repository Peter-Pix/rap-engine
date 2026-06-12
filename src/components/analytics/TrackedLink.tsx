"use client";

import { trackRelatedEntityClick, trackSimilarArtistClick } from "@/lib/analytics";

interface TrackedLinkProps {
  href: string;
  children: React.ReactNode;
  fromEntity: string;
  toEntity: string;
  toEntityTitle: string;
  relationType?: string;
  degree?: number;
  score?: number;
  isSimilarArtist?: boolean;
  className?: string;
}

export function TrackedLink({
  href,
  children,
  fromEntity,
  toEntity,
  toEntityTitle,
  relationType,
  degree,
  score,
  isSimilarArtist,
  className,
}: TrackedLinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => {
        if (isSimilarArtist && score != null) {
          trackSimilarArtistClick(fromEntity, toEntityTitle, score);
        } else {
          trackRelatedEntityClick(fromEntity, toEntityTitle, relationType ?? "related", degree ?? 1);
        }
      }}
    >
      {children}
    </a>
  );
}
