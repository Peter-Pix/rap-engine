// src/lib/content/images.ts — Artist image resolver
// Maps artist slugs to local image paths
// Images are synced from Base44 or other sources to /public/images/artists/

const ARTIST_IMAGES: Record<string, string> = {
  // Base44 synced photos
  'calin': '/images/artists/calin.webp',
  'robin-tent': '/images/artists/robin-tent.webp',
  'majk-spirit': '/images/artists/majk-spirit.webp',
  'redzed': '/images/artists/redzed.webp',
  'g1nter': '/images/artists/g1nter.webp',
          'dalyb': '/images/artists/dalyb.webp',
  'strapo': '/images/artists/strapo.webp',
  'nobodylisten': '/images/artists/nobodylisten.webp',
  'paulie-garand': '/images/artists/paulie-garand.webp',
  'tafrob': '/images/artists/tafrob.webp',
  'separ': '/images/artists/separ.webp',
  'radikal-chef': '/images/artists/radikal-chef.webp',
  'pil-c': '/images/artists/pil-c.webp',
  'fobia-kid': '/images/artists/fobia-kid.webp',
  'dame': '/images/artists/dame.webp',
  'gleb': '/images/artists/gleb.webp',
  'samey': '/images/artists/samey.webp',
  'hasan': '/images/artists/hasan.webp',
  '58g': '/images/artists/58g.webp',
      'yzomandias': '/images/artists/yzomandias.webp',
  'robin-zoot': '/images/artists/robin-zoot.webp',
  'dollar-prync': '/images/artists/dollar-prync.webp',
  'stein27': '/images/artists/stein27.webp',
  'saul': '/images/artists/saul.webp',
    'adiss': '/images/artists/adiss.webp',
      'nik-tendo': '/images/artists/nik-tendo.webp',
      'rytmus': '/images/artists/rytmus.webp',
        'viktor-sheen': '/images/artists/viktor-sheen.webp',
        'hugo-toxxx': '/images/artists/hugo-toxxx.webp',
        'james-cole': '/images/artists/james-cole.webp',
        'rest': '/images/artists/rest.webp',
      'ektor': '/images/artists/ektor.webp',
    'ben-cristovao': '/images/artists/ben-cristovao.webp',
    'dj-wich': '/images/artists/dj-wich.webp',
    'maniak': '/images/artists/maniak.webp',
    'michajlov': '/images/artists/michajlov.webp',
  'dj-fatte': '/images/artists/dj-fatte.webp',
  'ego': '/images/artists/ego.webp',
  'mc-gey': '/images/artists/mc-gey.webp',
  'sima': '/images/artists/sima.webp',
};

export function getArtistImage(slug: string): string | undefined {
  return ARTIST_IMAGES[slug];
}

export function hasArtistImage(slug: string): boolean {
  return slug in ARTIST_IMAGES;
}

// Future: sync from Base44 API automatically
// export async function syncArtistImagesFromBase44() { ... }
