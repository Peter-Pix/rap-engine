// src/lib/content/images.ts — Artist image resolver
// Maps artist slugs to local image paths
// Images are synced from Base44 or other sources to /public/images/artists/

const ARTIST_IMAGES: Record<string, string> = {
  // Base44 synced photos
  'calin': '/images/artists/calin.webp',
  'robin-tent': '/images/artists/robin-tent.webp',
};

export function getArtistImage(slug: string): string | undefined {
  return ARTIST_IMAGES[slug];
}

export function hasArtistImage(slug: string): boolean {
  return slug in ARTIST_IMAGES;
}

// Future: sync from Base44 API automatically
// export async function syncArtistImagesFromBase44() { ... }
