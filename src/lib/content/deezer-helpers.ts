/**
 * Deezer helpers — extrakce track/album ID z URL a sestavení widget URL.
 *
 * Deezer widget URL formát: https://widget.deezer.com/widget/auto/track/{id}
 * Embed URL (pro iframe):   https://widget.deezer.com/widget/dark/track/{id}
 *
 * Odkazy v datech mají tvar:
 *   - https://www.deezer.com/track/123456
 *   - https://www.deezer.com/album/789012
 *   - https://deezer.com/track/123456 (bez www)
 *
 * Widget je oficiální Deezer feature, právně čistý, 30s preview.
 */

/**
 * Extrahuje Deezer track ID z libovolného track URL.
 * Vrací null pokud URL neobsahuje match.
 *
 * @example
 *   extractDeezerTrackId("https://www.deezer.com/track/123") // → "123"
 *   extractDeezerTrackId("https://deezer.com/track/456/")   // → "456"
 *   extractDeezerTrackId(null)                              // → null
 */
export function extractDeezerTrackId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/deezer\.com\/track\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extrahuje Deezer album ID z libovolného album URL.
 */
export function extractDeezerAlbumId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/deezer\.com\/album\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Sestaví oficiální Deezer widget URL.
 *
 * @example
 *   deezerWidgetUrl("track", "123")
 *   // → "https://widget.deezer.com/widget/auto/track/123"
 */
export function deezerWidgetUrl(
  type: "track" | "album",
  id: string,
  theme: "light" | "dark" | "auto" = "dark",
): string {
  return `https://widget.deezer.com/widget/${theme}/${type}/${id}`;
}

/**
 * Helper pro embed iframe (kompletní <iframe> element).
 *
 * Vrací null pokud URL/trackID chybí.
 */
export function deezerTrackEmbed(
  trackUrl: string | null | undefined,
  options: { theme?: "light" | "dark" | "auto"; width?: string | number; height?: string | number } = {},
): { src: string; width: string; height: string } | null {
  const id = extractDeezerTrackId(trackUrl);
  if (!id) return null;
  return {
    src: deezerWidgetUrl("track", id, options.theme ?? "dark"),
    width: String(options.width ?? "100%"),
    height: String(options.height ?? 80),
  };
}

/**
 * Přehrát celé album jako Deezer widget (delší height).
 */
export function deezerAlbumEmbed(
  albumUrl: string | null | undefined,
  options: { theme?: "light" | "dark" | "auto"; width?: string | number; height?: string | number } = {},
): { src: string; width: string; height: string } | null {
  const id = extractDeezerAlbumId(albumUrl);
  if (!id) return null;
  return {
    src: deezerWidgetUrl("album", id, options.theme ?? "dark"),
    width: String(options.width ?? "100%"),
    height: String(options.height ?? 240),
  };
}
