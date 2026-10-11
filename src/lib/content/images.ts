// src/lib/content/images.ts — Artist image resolver
// Maps artist slugs to local image paths
// Images are synced from Base44 or other sources to /public/images/artists/

const ARTIST_IMAGES: Record<string, string> = {
  // Base44 synced photos
  'calin': '/images/artists/calin.webp',
  'robin-tent': '/images/artists/robin-tent.webp',
  'majk-spirit': '/images/artists/majk-spirit.webp',
  'mejzyy': '/images/artists/mejzyy.webp',
  'redzed': '/images/artists/redzed.webp',
  'g1nter': '/images/artists/g1nter.webp',
          'dalyb': '/images/artists/dalyb.webp',
  'strapo': '/images/artists/strapo.webp',
  'nobodylisten': '/images/artists/nobodylisten.webp',
  'paulie-garand': '/images/artists/paulie-garand.webp',
  'tafrob': '/images/artists/tafrob.webp',
  'totally-nothin': '/images/artists/totally-nothin.webp',
  'separ': '/images/artists/separ.webp',
  'radikal-chef': '/images/artists/radikal-chef.webp',
  'pil-c': '/images/artists/pil-c.webp',
  'fobia-kid': '/images/artists/fobia-kid.webp',
  'forest-blunt': '/images/artists/forest-blunt.webp',
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
  'aless': '/images/artists/aless.webp',
      'nik-tendo': '/images/artists/nik-tendo.webp',
      'rytmus': '/images/artists/rytmus.webp',
        'viktor-sheen': '/images/artists/viktor-sheen.webp',
        'hugo-toxxx': '/images/artists/hugo-toxxx.webp',
        'james-cole': '/images/artists/james-cole.webp',
        'rest': '/images/artists/rest.webp',
      'ektor': '/images/artists/ektor.webp',
    'ben-cristovao': '/images/artists/ben-cristovao.webp',
    'dj-wich': '/images/artists/dj-wich.webp',
  'dj-enemy': '/images/artists/dj-enemy.webp',
    'maniak': '/images/artists/maniak.webp',
    'michajlov': '/images/artists/michajlov.webp',
  'dj-fatte': '/images/artists/dj-fatte.webp',
  'ego': '/images/artists/ego.webp',
  'mc-gey': '/images/artists/mc-gey.webp',
  'sima': '/images/artists/sima.webp',
  'grey256': '/images/artists/grey256.webp',
  'sergei-barracuda': '/images/artists/sergei-barracuda.webp',
  'lvcas-dope': '/images/artists/lvcas-dope.webp',
  '7krat3': '/images/artists/7krat3.webp',
  'astralkid22': '/images/artists/astralkid22.webp',
  'ca-hanova-bulhar': '/images/artists/ca-hanova-bulhar.webp',
  'fosco-alma': '/images/artists/fosco-alma.webp',
  'kali': '/images/artists/kali.webp',
  'mike-trafik': '/images/artists/mike-trafik.webp',
  'psh': '/images/artists/psh.webp',
  'refew': '/images/artists/refew.webp',
  'reznik': '/images/artists/reznik.webp',
  'smack': '/images/artists/smack.webp',
  'smack-one': '/images/artists/smack-one.webp',
  'sorty': '/images/artists/sorty.webp',
  'vladimir-518': '/images/artists/vladimir-518.webp',
  'sofian-medjmedj': '/images/artists/sofian-medjmedj.webp',
  'cistychov': '/images/artists/cistychov.webp',
  'dokkeytino': '/images/artists/dokkeytino.webp',
  'protiva': '/images/artists/protiva.webp',
  'fvck-kvlt': '/images/artists/fvck-kvlt.webp',
  'lipo': '/images/artists/lipo.webp',
  'arleta': '/images/artists/arleta.webp',
  'labello': '/images/artists/labello.webp',
  'vercetti-cg': '/images/artists/vercetti-cg.webp',
  'renne-dang': '/images/artists/renne-dang.webp',
  'ptk': '/images/artists/ptk.webp',
  'bobby-blaze': '/images/artists/bobby-blaze.webp',
  'jay-diesel': '/images/artists/jay-diesel.webp',
  'sensey': '/images/artists/sensey.webp',
  'marpo': '/images/artists/marpo.webp',
  'astral': '/images/artists/astral.webp',
  'luca-brassi10x': '/images/artists/luca-brassi10x.webp',
  'boy-wonder': '/images/artists/boy-wonder.webp',
  'tenki': '/images/artists/tenki.webp',
  'palermo': '/images/artists/palermo.webp',
  'la4': '/images/artists/la4.webp',
  'dara-rolins': '/images/artists/dara-rolins.webp',
  'orion': '/images/artists/orion.webp',
  'sharlota': '/images/artists/sharlota.webp',
  'kato': '/images/artists/kato.webp',
  'karlo': '/images/artists/karlo.webp',
  'pain': '/images/artists/pain.webp',
  'koky': '/images/artists/koky.webp',
  'idea': '/images/artists/idea.webp',
  'konex': '/images/artists/konex.webp',
  'prezident-lourajder': '/images/artists/prezident-lourajder.webp',
  'shimmi': '/images/artists/shimmi.webp',
  'jickson': '/images/artists/jickson.webp',
  'kojo': '/images/artists/kojo.webp',
  'annet-x': '/images/artists/annet-x.webp',
  'hellwana': '/images/artists/hellwana.webp',
  'guapanova': '/images/artists/guapanova.webp',
  'daniel-vardan': '/images/artists/daniel-vardan.webp',
  'desade': '/images/artists/desade.webp',
  'darewin': '/images/artists/darewin.webp',
  'duan-vlk': '/images/artists/duan-vlk.webp',
  'schyzo': '/images/artists/schyzo.webp',
  'katannah': '/images/artists/katannah.webp',
  'kamil-hoffmann': '/images/artists/kamil-hoffmann.webp',
  'resetedh': '/images/artists/resetedh.webp',
  'alan-murin': '/images/artists/alan-murin.webp',
  'd-kop': '/images/artists/d-kop.webp',
  'dj-aka': '/images/artists/dj-aka.webp',
  'dorian': '/images/artists/dorian.webp',
  'hard-rico': '/images/artists/hard-rico.webp',
  'indy': '/images/artists/indy.webp',
  'marko-damian': '/images/artists/marko-damian.webp',
  'miky-mora': '/images/artists/miky-mora.webp',
  'momo': '/images/artists/momo.webp',
  'radimo': '/images/artists/radimo.webp',
  'supa': '/images/artists/supa.webp',
  'zayo': '/images/artists/zayo.webp',
  'skipe': '/images/artists/skipe.webp',
  'beatz': '/images/artists/beatz.webp',
  'ironkap': '/images/artists/ironkap.webp',
  'avio': '/images/artists/avio.webp',
  'inphy': '/images/artists/inphy.webp',
  'kato-prago-union': '/images/artists/kato-prago-union.webp',
  'tisci': '/images/artists/tisci.webp',
  'tubs': '/images/artists/tubs.webp',
  'pretorian': '/images/artists/pretorian.webp',
  'frank-flames': '/images/artists/frank-flames.webp',
  'zverina': '/images/artists/zverina.webp',
  'pio-squad': '/images/artists/pio-squad.webp',
  'sakito': '/images/artists/sakito.webp',
  'morelo': '/images/artists/morelo.webp',
  'prago-union': '/images/artists/prago-union.webp',
  'skinny-barber': '/images/artists/skinny-barber.webp',
  'enthic': '/images/artists/enthic.webp',
  'zuris': '/images/artists/zuris.webp',
  'dano-kapitan': '/images/artists/dano-kapitan.webp',
  'yeezuz2020': '/images/artists/yeezuz2020.webp',
  'og-pav': '/images/artists/og-pav.webp',
  'johny-machette': '/images/artists/johny-machette.webp',
  'mega-m': '/images/artists/mega-m.webp',
  'mdmx': '/images/artists/mdmx.webp',
  'dejv': '/images/artists/dejv.webp',
  'matej-straka': '/images/artists/matej-straka.webp',
  'marger': '/images/artists/marger.webp',
  'nase-vec': '/images/artists/nase-vec.webp',
  '2jay': '/images/artists/2jay.webp',
  'rollsout': '/images/artists/rollsout.webp',
  'kup-kodein': '/images/artists/kup-kodein.webp',
  'delik': '/images/artists/delik.webp',
  'sawsane': '/images/artists/sawsane.webp',
  'j2000': '/images/artists/j2000.webp',
  'abde': '/images/artists/abde.webp',
  'kenny-rough': '/images/artists/kenny-rough.webp',
  'vae-cortez': '/images/artists/vae-cortez.webp',
  'tchagun': '/images/artists/tchagun.webp',
  'precedens': '/images/artists/precedens.webp',
  'regie-257': '/images/artists/regie-257.webp',
  'ota-petrina': '/images/artists/ota-petrina.webp',
  'psycho-rhyme': '/images/artists/psycho-rhyme.webp',
  'dymer-surovec': '/images/artists/dymer-surovec.webp',
  'porsche-boy': '/images/artists/porsche-boy.webp',
  'churaq-sputnik': '/images/artists/churaq-sputnik.webp',
  'jckpt': '/images/artists/jckpt.webp',
  'frayer-flexking': '/images/artists/frayer-flexking.webp',
  'dj-richard': '/images/artists/dj-richard.webp',
  'koukr': '/images/artists/koukr.webp',
  'chacharski': '/images/artists/chacharski.webp',
  'slipo': '/images/artists/slipo.webp',
  'decky': '/images/artists/decky.webp',
  'headdy': '/images/artists/headdy.webp',
  'otecko': '/images/artists/otecko.webp',
  'majself': '/images/artists/majself.webp',
  'chubeats': '/images/artists/chubeats.webp',
  'neries': '/images/artists/neries.webp',
  'irit': '/images/artists/irit.webp',
  'similivinlife': '/images/artists/similivinlife.webp',
  'milan-andre-boronell': '/images/artists/milan-andre-boronell.webp',
  'the-mag': '/images/artists/the-mag.webp',
  'xindl-x': '/images/artists/xindl-x.webp',
  'kyle-junior': '/images/artists/kyle-junior.webp',
  'grimaso': '/images/artists/grimaso.webp',
  'loko-loko': '/images/artists/loko-loko.webp',
  'haha-crew': '/images/artists/haha-crew.webp',
  'lboy-bsc': '/images/artists/lboy-bsc.webp',
  'makin-hollov': '/images/artists/makin-hollov.webp',
  'huclberry': '/images/artists/huclberry.webp',
  'dtonate': '/images/artists/dtonate.webp',
  'vladkysyn': '/images/artists/vladkysyn.webp',
  'shaka-cg': '/images/artists/shaka-cg.webp',
  'dj-rusty': '/images/artists/dj-rusty.webp',
  'plura': '/images/artists/plura.webp',
  'fejbs': '/images/artists/fejbs.webp',
  'martin-svatek': '/images/artists/martin-svatek.webp',
  'haades': '/images/artists/haades.webp',
  'evil-dope': '/images/artists/evil-dope.webp',
  'skelly': '/images/artists/skelly.webp',
  'apoka': '/images/artists/apoka.webp',
  'katarzia': '/images/artists/katarzia.webp',
  'moloch-vlavo': '/images/artists/moloch-vlavo.webp',
  'laris-diam': '/images/artists/laris-diam.webp',
  'vojtaano': '/images/artists/vojtaano.webp',
  'filip-konvalinka': '/images/artists/filip-konvalinka.webp',
  'jakub-dekan': '/images/artists/jakub-dekan.webp',
  'dj-flux': '/images/artists/dj-flux.webp',
  'raego': '/images/artists/raego.webp',
  'blako': '/images/artists/blako.webp',
  'mamba-dasha': '/images/artists/mamba-dasha.webp',
  'batrs': '/images/artists/batrs.webp',
  'berlin-manson': '/images/artists/berlin-manson.webp',
};

export function getArtistImage(slug: string): string | undefined {
  return ARTIST_IMAGES[slug];
}

export function hasArtistImage(slug: string): boolean {
  return slug in ARTIST_IMAGES;
}

/** Deezer placeholder — nikdy nezobrazovat (šedý obrázek). */
function isPlaceholder(url: string): boolean {
  return /\/placeholder\//.test(url) || /placeholder/i.test(url);
}

/**
 * Sjednocený resolver obrázku umělce.
 *
 * Priority:
 *  1. Kanonická mapa ARTIST_IMAGES (lokální /images/artists/*.webp)
 *  2. Cache `image`, pokud je lokální a v kanonickém tvaru
 *  3. Normalizace starých cest `/images/raperi/x.jpg` → `/images/artists/x.webp`
 *  4. Deezer CDN (jen pokud není placeholder)
 *
 * Vrací `undefined`, když není co zobrazit → volající má fallback (iniciála).
 * Tím se odstraní rozbité ikony obrázku.
 */
export function resolveArtistImage(
  slug: string,
  cacheImage?: string | null,
): string | undefined {
  // 1) Kanonická mapa — nejspolehlivější (soubory existují)
  const canonical = ARTIST_IMAGES[slug];
  if (canonical) return canonical;

  const raw = (cacheImage ?? "").trim();
  if (!raw) return undefined;

  // 4) Placeholder nikdy
  if (isPlaceholder(raw)) return undefined;

  // 2) Lokální kanonická cesta
  if (raw.startsWith("/images/artists/")) return raw;

  // 3) Stará cesta /images/raperi/<slug>.<ext> → /images/artists/<slug>.webp
  const legacy = raw.match(/^\/images\/raperi\/([^/]+)\.(?:jpg|jpeg|png|webp)$/i);
  if (legacy) {
    const mapped = ARTIST_IMAGES[legacy[1].toLowerCase()];
    if (mapped) return mapped;
    return `/images/artists/${legacy[1].toLowerCase()}.webp`;
  }

  // 4) Vzdálené (Deezer CDN) — nech, pokud to není placeholder
  if (/^https?:\/\//.test(raw)) return raw;

  return undefined;
}

// Future: sync from Base44 API automatically
// export async function syncArtistImagesFromBase44() { ... }
