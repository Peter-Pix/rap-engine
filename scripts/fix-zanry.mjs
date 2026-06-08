#!/usr/bin/env node
// fix-zanry.mjs — doplní origin: + rozšíří slabé žánrové stránky
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const zanryDir = join(__dirname, '..', 'content', 'zanry')

// ─── Mapování žánr → origin ─────────────────────────────────────────
const origins = {
  'abstract-hip-hop': 'USA (1990s)',
  'academic-rap': 'USA (2000s)',
  'afro-rap': 'Afrika / diaspora (1980s)',
  'afrobeats': 'Západní Afrika (2000s)',
  'alternative-hip-hop': 'USA (1990s)',
  'alternative-rap': 'USA (1990s)',
  'ambient-rap': 'USA (2010s)',
  'art-rap': 'USA (1990s)',
  'bassline': 'Sheffield / UK (2000s)',
  'boom-bap': 'New York, USA (1980s–90s)',
  'britsky-hip-hop': 'Spojené království (1980s)',
  'cloud-rap': 'USA (late 2000s)',
  'comedy-rap': 'USA (1980s)',
  'comic-book-rap': 'USA (1990s)',
  'conceptual-rap': 'USA (1990s)',
  'conscious-rap': 'USA (1980s)',
  'country-rap': 'USA (1990s)',
  'czech-pop': 'Česká republika (1990s)',
  'czech-rap': 'Česká republika (1990s)',
  'dance-rap': 'USA (1980s)',
  'dancehall': 'Jamajka (1970s)',
  'dark-rap': 'USA / EU (2010s)',
  'dark-trap': 'USA (2010s)',
  'drill': 'Chicago, USA (2010s) → UK → ČR',
  'drum-and-bass': 'Spojené království (1990s)',
  'drum-and-bass-mc': 'Spojené království (1990s)',
  'east-coast-rap': 'New York, USA (1980s)',
  'electronic-rap': 'USA / EU (2000s)',
  'emo-rap': 'USA (2010s)',
  'experimental-hip-hop': 'USA (1990s)',
  'experimental-rap': 'USA (1990s)',
  'experimental-trap': 'USA (2010s)',
  'freestyle-rap': 'USA (1970s)',
  'gangsta-rap': 'Los Angeles, USA (1980s)',
  'garage-punk': 'USA (1980s)',
  'glitch-hop': 'USA (2000s)',
  'gothic-rap': 'USA (2000s)',
  'grime': 'Londýn, Spojené království (2000s)',
  'hardcore-punk': 'USA / UK (1970s–80s)',
  'hardcore-rap': 'USA (1980s)',
  'hip-hop': 'Bronx, New York, USA (1970s)',
  'horrorcore': 'USA (1990s)',
  'house-rap': 'Chicago / USA (1980s)',
  'jazz-rap': 'USA (1990s)',
  'jungle-mc': 'Spojené království (1990s)',
  'lo-fi-rap': 'USA (2010s)',
  'lyrical-rap': 'USA (1980s)',
  'mafioso-rap': 'USA (1990s)',
  'mainstream-rap': 'USA (1990s)',
  'melodic-rap': 'USA (2000s)',
  'melodic-trap': 'USA (2010s)',
  'modern-rap': 'USA (2010s)',
  'mumble-rap': 'USA (2010s)',
  'mystical-rap': 'USA (1990s)',
  'mythological-rap': 'USA (1990s)',
  'nu-metal': 'USA (1990s)',
  'oriental-rap': 'Střední východ / Evropa (2000s)',
  'party-rap': 'USA (1980s)',
  'political-punk': 'USA / UK (1970s)',
  'political-rap': 'USA (1980s)',
  'pop': 'USA / celosvětově (1950s)',
  'pop-rap': 'USA (1990s) → celosvětový fenomén',
  'pop-rock': 'USA / UK (1960s)',
  'pornorap': 'USA (2000s)',
  'power-metal': 'Německo (1980s)',
  'psychedelic-rap': 'USA (2000s)',
  'punk': 'USA / UK (1970s)',
  'punk-rap': 'USA (1990s)',
  'rage': 'USA (2010s–20s)',
  'rap': 'USA (1970s)',
  'rap-metal': 'USA (1990s)',
  'reggaeton': 'Portoriko (1990s)',
  'rnb': 'USA (1940s–80s)',
  'road-rap': 'USA (2000s)',
  'rock-rap': 'USA (1980s)',
  'sad-rap': 'USA (2010s)',
  'shock-rap': 'USA (1990s)',
  'slovak-rap': 'Slovenská republika (1990s)',
  'soul': 'USA (1950s–60s)',
  'southern-rap': 'Jižní USA (1990s)',
  'spoken-word': 'USA (1960s)',
  'street-rap': 'USA (1980s)',
  'theater-rap': 'USA (2000s)',
  'traditional-metal': 'USA / UK (1970s)',
  'trap': 'Atlanta, USA (2000s)',
  'trap-metal': 'USA (2010s)',
  'turntablism': 'USA (1970s)',
  'uk-garage': 'Londýn, Spojené království (1990s)',
  'uk-rap': 'Spojené království (1990s)',
  'underground-hip-hop': 'USA (1990s)',
  'underground-rap': 'USA (1980s–90s)',
  'underground-rock': 'USA (1980s)',
}

// ─── Rozšíření slabých stránek ──────────────────────────────────────
// Klíč = slug_dash (filename bez .mdx), hodnota = text k vložení pod ---
const expansions = {
  'hip-hop': `
Hip-hop je víc než hudba — je to kultura. Vznikl v 70. letech v Bronxu jako hlas marginalizované komunity a postupně se stal globálním fenoménem.

## Čtyři pilíře

DJing, MCing (rap), breakdance a graffiti — čtyři disciplíny, které dohromady definují hip-hopovou kulturu. Každý pilíř vznikl nezávisle, ale propojila je společná energie blokových párty.

## Česká hip-hopová scéna

Do Česka hip-hop dorazil začátkem 90. let. Klíčové postavy první generace: **PSH** (Orion, Vladimir 518), **Chaozz** (Kato), **Indy & Wich**, **L.U.Z.A.** Postupně se scéna diverzifikovala — od boom bapu přes underground až po mainstreamový trap a drill. Dnes je hip-hop v ČR jedním z nejposlouchanějších žánrů u mladé generace.

## Současnost

Český hip-hop zahrnuje široké spektrum — od old-schoolových puristů (Prago Union) přes mainstreamové hvězdy (Viktor Sheen, Kali) po experimentátory (NobodyListen). Scéna je živá, různorodá a stále se vyvíjí.`,

  'rap': `
Rap je rytmický mluvený přednes nad beatem — primární vokální technika hip-hopu a základní stavební kámen celého žánru.

## Rap vs hip-hop

V češtině se výrazy často zaměňují. Rap je technika (vokální projev); hip-hop je celková kultura (DJing, MCing, breakdance, graffiti). Album může být "rapové" (technika), umělec se identifikuje s "hip-hopem" (kulturou).

## Technika

Rap stojí na rýmu, flow a groove. Dobrý rapper ovládá multirýmování, syncopu a umí pracovat s beatem. Flow se liší podle subžánru — pomalý a důrazný v drillu, technický a rychlý v grime, melodický v trap a pop-rapu.

## Subžánry

Trap, drill, boom bap, conscious rap, mumble rap, cloud rap, emo rap, horrorcore, grime — každý subžánr má vlastní zvukové charakteristiky a historický kontext, ale všechny stojí na rapové technice.

## Česká rapová scéna

Český rap má vlastní slovník, rýmové možnosti dané češtinou a specifický humor. Od lyrických textů MC Geye přes syrový street rap PSH až po temný dark rap Milion+ — český rap je stejně různorodý jako jeho americký vzor.`,

  'pop-rap': `
Pop-rap je most mezi hip-hopovou autenticitou a mainstreamovou popovou přístupností — a v Česku je to jeden z nejposlouchanějších rapových stylů.

## Charakteristika

Rapové verše s pop refrénem, polished produkce, důraz na radio-friendly hit. Chytlavé melodie, jednoduché texty o vztazích a životě. Beat často kombinuje trapové prvky s popovou harmonií.

## Česká scéna

V Česku pop-rap dominuje streamovacím žebříčkům. **Separ** je nejvýraznějším představitelem — kombinuje street kořeny s hitovými melodiemi. **Kali** přináší melodičtější verzi s reggaetonovými vlivy. **Viktor Sheen** operuje na pomezí pop-rapu a trapu. **Ben Cristovao** je čistý pop-rap s taneční produkcí. Pop-rap je v ČR cestou, jak dostat rap do rádií a k širšímu publiku.`,

  'dark-rap': `
Dark rap není formalizovaný žánr — je to **estetická kategorie**, která prochází napříč trap, drill a experimentálním rapem.

## Charakteristika

Temné samply (často minor klávesy, atmosférické plochy), lo-fi mixing, distorted 808, introspektivní nebo nihilistická lyrika. Dark rap není o technice — je o náladě a atmosféře.

## Česká scéna

**Milion+ kolektiv** definoval český dark rap — **Yzomandias**, **Gleb**, **Calin** patří k pražským reprezentantům dark rap estetiky. Temné videoklipy, černobílá vizuální identita, texty o depresi, prázdnotě a toxických vztazích. Dark rap je v ČR často synonymem pro miliónovský zvuk a rezonuje silně s mladou generací.

## Související žánry

Trap, drill, cloud-rap, emo-rap — dark rap estetika se prolíná všemi těmito žánry, aniž by byla formálně definovaná.`,

  'pop': `
Pop není primárně rapový žánr — je to zastřešující kategorie pro mainstreamovou, široce přístupnou hudbu. V rapovém kontextu se používá jako označení pro umělce a tracky, které kombinují rap s pop melodikou.

## Pop-rap

Když rapový umělec sahá po pop produkci a refrénech zaměřených na hit potential, mluvíme o pop-rapu. **SharkaSs**, **Viktor Sheen**, **Ben Cristovao** nebo některé tracky **Separ** a **Kali** toto teritorium pokrývají. Pop-rap je dominantním proudem českého rapu na streamovacích platformách.

## V mainstreamu

Pop jako kategorie pomáhá zařadit umělce, kteří překračují hranice žánrů — jejich hudba je "popová" v tom smyslu, že je přístupná širšímu publiku, i když vychází z rapu.`,

  'pop-rock': `
Pop-rock je hybrid mezi popem a rockem — chytlavé refrény s elektrickou kytarou a živými bicími. Není to primárně rapový žánr, ale v českém kontextu se objevuje u umělců s rockovými kořeny.

## V rapovém kontextu

Pro umělce jako **Marpo**, kteří přicházejí z rockové scény (Marpo dříve hrál v rockové kapele Chinaski), je pop-rock referenčním rámcem. Jeho rapové projekty často nesou rockové DNA — živé bicí, kytary, refrény.

## Příbuzné žánry

Rock-rap, nu-metal, rap-rock — tyto žánry jsou v českém rapu viditelnější než čistý pop-rock, ale všechny sdílejí propojení rapového vokálu s rockovou instrumentací.`,
}

// ─── Hlavní logika ──────────────────────────────────────────────────
const files = readdirSync(zanryDir).filter(f => f.endsWith('.mdx'))

// 1. Smazat duplicitní rnb.mdx3
try {
  unlinkSync(join(zanryDir, 'rnb.mdx3'))
  console.log('🗑️  Smazáno: rnb.mdx3 (duplicitní)')
} catch (e) {
  // už neexistuje, ok
}

let fixed = 0
let expanded = 0

for (const file of files) {
  if (file === 'rnb.mdx3') continue
  const slug = file.replace('.mdx', '')
  const path = join(zanryDir, file)
  let content = readFileSync(path, 'utf8')
  let changed = false

  // 2. Přidat origin: (hned za description:)
  if (origins[slug] && !content.includes('origin:')) {
    content = content.replace(/description:.*\n/, m => `${m}origin: "${origins[slug]}"\n`)
    changed = true
    fixed++
  }

  // 3. Rozšířit slabé stránky — nahradit celý obsah za frontmatterem
  if (expansions[slug]) {
    const fmEnd = content.indexOf('\n---\n', 3) + 5
    const before = content.slice(0, fmEnd)
    content = before + '\n' + expansions[slug].trim() + '\n'
    changed = true
    expanded++
  }

  if (changed) {
    writeFileSync(path, content, 'utf8')
  }
}

console.log(`✅ origin: přidáno do ${fixed} souborů`)
console.log(`📖 rozšířeno ${expanded} stránek`)
console.log(`🏁 Hotovo!`)