/**
 * Thin wrapper pro Google Analytics event tracking.
 * Bezpečně volá window.gtag pouze v prohlížeči.
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  if (typeof window === "undefined" || !window.gtag) return;

  const cleanParams = Object.fromEntries(
    Object.entries(params ?? {}).filter(([, v]) => v != null)
  );

  window.gtag("event", eventName, cleanParams);
}

/** ─── Predefined events ───────────────────────────────────────── */

export function trackSearch(query: string, resultCount: number) {
  trackEvent("search", {
    search_term: query,
    result_count: resultCount,
  });
}

export function trackSearchResultClick(
  query: string,
  resultTitle: string,
  resultType: string,
  position: number
) {
  trackEvent("search_result_click", {
    search_term: query,
    result_title: resultTitle,
    result_type: resultType,
    position: position + 1,
  });
}

export function trackEntityCardClick(
  title: string,
  type: string,
  context?: string
) {
  trackEvent("entity_card_click", {
    entity_title: title,
    entity_type: type,
    context: context ?? "grid",
  });
}

export function trackRelatedEntityClick(
  fromEntity: string,
  toEntity: string,
  relationType: string,
  degree: number
) {
  trackEvent("related_entity_click", {
    from_entity: fromEntity,
    to_entity: toEntity,
    relation_type: relationType,
    degree,
  });
}

export function trackSimilarArtistClick(
  fromArtist: string,
  toArtist: string,
  score?: number
) {
  trackEvent("similar_artist_click", {
    from_artist: fromArtist,
    to_artist: toArtist,
    similarity_score: score ?? 0,
  });
}

export function trackScrollDepth(depthPercent: number) {
  trackEvent("scroll_depth", {
    depth_percent: depthPercent,
    page_path: window.location.pathname,
  });
}

export function trackNotFound(path: string, referrer?: string) {
  trackEvent("404_error", {
    path,
    referrer: referrer ?? document.referrer,
  });
}
