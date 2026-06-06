import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════
// generate-missing-genres.mjs
//
// Vytvoří chybějící stránky žánrů v content/zanry/ s plným
// obsahem, prolinkováním na interprety a kontextem české scény.
// ═══════════════════════════════════════════════════════════════

const dirs = ['content/raperi', 'content/alba', 'content/skladby']

// Collect all entities by genre
const genreMap = {}
const existingSlugs = new Set()
for (const f of readdirSync('content/zanry')) {
  if (f.endsWith('.mdx')) existingSlugs.add(f.replace('.mdx', ''))
}

// Collect all rapper names for interlinking
const rapperNames = {}
for (const f of readdirSync('content/raperi')) {
  if (!f.endsWith('.mdx')) continue
  const content = readFileSync(join('content/raperi', f), 'utf-8')
  const slug = f.replace('.mdx', '')
  const titleMatch = content.match(/^title:\s*"(.+?)"/m)
  rapperNames[slug] = titleMatch ? titleMatch[1] : slug
}

for (const dir of dirs) {
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mdx')) continue
    const content = readFileSync(join(dir, f), 'utf-8')
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) continue
    const fm = fmMatch[1]
    const slug = f.replace('.mdx', '')
    const titleMatch = fm.match(/^title:\s*"(.+?)"/m)
    const title = titleMatch ? titleMatch[1] : slug

    const mlMatch = fm.match(/^genre:\s*\n([\s\S]*?)(?=^[a-z])/m)
    if (mlMatch) {
      const vals = [...mlMatch[1].matchAll(/-\s*"([^"]+)"/g)].map(m => m[1])
      for (const v of vals) {
        const norm = v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        if (!genreMap[norm]) genreMap[norm] = { rappers: [], albums: [], tracks: [] }
        if (dir.includes('raperi')) genreMap[norm].rappers.push({ slug, title })
        else if (dir.includes('alba')) genreMap[norm].albums.push({ slug, title })
        else if (dir.includes('skladby')) genreMap[norm].tracks.push({ slug, title })
      }
    }
  }
}

// ─── Content templates ─────────────────────────────────────────

const CONTENT = {
  'abstract-hip-hop': {
    title: 'Abstract Hip Hop',
    description: 'Abstract hip hop je experimentální odnož rapu, která pracuje s nekonvenčními beaty, abstraktními texty a avantgardní produkcí.',
    body: `**Abstract hip hop** je intelektuální větev hip hopu, která odmítá mainstreamové šablony. Místo hooků a trapových beatů tu najdeš volné asociace, jazzové samply a texty, co připomínají spíš poezii než rap.

## Charakteristika

- abstraktní, často surrealistické texty
- nekonvenční beaty (jazz, elektronika, field recordings)
- důraz na atmosféru a náladu
- odmítání tradiční struktury sloka-refrén

## Česká scéna

Abstract hip hop v Česku nemá vlastní scénu, ale jeho prvky najdeš u interpretů, kteří tlačí hranice žánru.`,
  },

  'afro-rap': {
    title: 'Afro Rap',
    description: 'Afro rap propojuje hip hop s africkými rytmy, tradičními nástroji a vokálními styly napříč kontinentem.',
    body: `**Afro rap** není jeden žánr — je to střecha pro všechno, co spojuje hip hop s africkou hudební tradicí. Od afrobeats po highlife, od ghanského drillu po jihoafrický kwaito.

## Charakteristika

- africké rytmické patterny
- propojení s afrobeats, dancehall, amapiano
- texty často v lokálních jazycích
- globální přesah

## Česká scéna

V Česku afro rap reprezentuje **Kojo**, jehož tvorba čerpá z ghanských kořenů a propojuje afrobeats s českým rapem.`,
  },

  'afrobeats': {
    title: 'Afrobeats',
    description: 'Afrobeats je západoafrický hudební styl kombinující tradiční rytmy s moderní popovou a hip hopovou produkcí.',
    body: `**Afrobeats** (nezaměňovat s Afrobeatem Fely Kuti) je globální fenomén 21. století. Vznikl v Ghaně a Nigérii a dnes ovlivňuje pop i rap po celém světě.

## Charakteristika

- výrazné perkusivní rytmy
- chytlavé melodie
- propojení s dancehallem a reggaetonem
- energie na taneční parket

## Česká scéna

Hlavním představitelem afrobeats v Česku je **Kojo**, který do svého rapu přirozeně integruje ghanské rytmy a vytváří unikátní crossover.`,
  },

  'alternative-hip-hop': {
    title: 'Alternative Hip Hop',
    description: 'Alternative hip hop je široký žánr zahrnující vše, co se vymyká mainstreamovému zvuku — experiment, eklekticismus a originalitu.',
    body: `**Alternative hip hop** je definovaný tím, co není. Není to trap, není to boom bap, není to pop rap. Je to prostor, kde se rap potkává s rockem, elektronikou, jazzem nebo čímkoli, co producenta zrovna napadne.

## Charakteristika

- eklektická produkce
- důraz na originalitu před formulí
- časté crossover s jinými žánry
- nezávislý duch

## Česká scéna

V Česku alternative hip hop reprezentují **Hasan** a **MC Gey** — oba známí tím, že se vymykají jakékoli škatulce.`,
  },

  'alternative-rap': {
    title: 'Alternative Rap',
    description: 'Alternative rap zahrnuje rappery, kteří vědomě překračují hranice žánru a míchají hip hop s prvky punku, elektroniky nebo metalu.',
    body: `**Alternative rap** je blízký příbuzný alternative hip hopu, ale s větším důrazem na vokální projev a texty. Často se překrývá s art rapem, punk rapem nebo experimental rapem.

## Charakteristika

- nekonvenční flow a přednes
- texty mimo rapová klišé
- ochota riskovat
- DIY přístup

## Česká scéna

Na české scéně alternative rap reprezentují **Arleta** a **Fvck_Kvlt** — oba s výrazným autorským rukopisem, který se nevejde do žádné škatulky.`,
  },

  'ambient-rap': {
    title: 'Ambient Rap',
    description: 'Ambient rap spojuje hip hop s ambientní a drone hudbou — pomalejší tempa, atmosférické plochy a introspektivní texty.',
    body: `**Ambient rap** je možná nejklidnější podoba rapu. Místo tvrdých beatů tu jsou vzdušné syntezátory, místo energického flow šeptaný přednes. Žánr, který vznikl na pomezí cloud rapu a lo-fi.

## Charakteristika

- pomalá tempa (60-80 BPM)
- ambientní plochy místo beatů
- introspektivní, často melancholické texty
- blízko k lo-fi a chillwave

## Česká scéna

V Česku ambient rap reprezentuje **Resetedh**, jehož tvorba staví na atmosféře a emocích víc než na tradiční rapové energii.`,
  },

  'art-rap': {
    title: 'Art Rap',
    description: 'Art rap posouvá hip hop k výtvarnému umění — konceptuální alba, performance, multimediální přesah a vědomá práce s formou.',
    body: `**Art rap** je rap, který se bere vážně jako umění. Ne jako zábava, ne jako byznys — jako výpověď. Konceptuální alba, promyšlená estetika, často přesah do výtvarna nebo divadla.

## Charakteristika

- konceptuální přístup k albům
- multimediální přesah
- důraz na formu i obsah
- často ironie a sebereflexe

## Česká scéna

Na české scéně art rap reprezentuje **D Ritch** — záhadný akademik-rapper, který možná ani neexistuje. Jeho tvorba balancuje na hraně rapu, performance artu a mystifikace.`,
  },

  'bassline': {
    title: 'Bassline',
    description: 'Bassline je britský elektronický žánr odvozený z UK garage a grime, postavený na výrazných basových linkách a rychlém tempu.',
    body: `**Bassline** vznikl v Sheffieldu a Birminghamu jako odnož UK garage. Je to hudba pro kluby — rychlá, basová, taneční. Na rozdíl od grime tu nejde o texty, ale o energii.

## Charakteristika

- 135-145 BPM
- výrazné wobble basy
- jednoduché beaty
- důraz na dropy a energii

## Česká scéna

Bassline není v Česku samostatná scéna, ale jeho prvky najdeš u producentů, kteří kombinují UK vlivy s lokálním rapem. Hlavním představitelem je **Big Narstie**, který bassline propojuje s grime a road rapem.`,
  },

  'comedy-rap': {
    title: 'Comedy Rap',
    description: 'Comedy rap používá humor, parodii a nadsázku jako hlavní výrazový prostředek — od absurdních textů po satirické alter ego.',
    body: `**Comedy rap** není jen "vtipný rap" — je to žánr, kde humor není doplněk, ale základ. Od parodií na rapová klišé po absurdní storytelling.

## Charakteristika

- humor jako hlavní složka
- parodie rapových tropů
- často ironie a nadsázka
- blízko k meme rapu

## Česká scéna

V Česku comedy rap reprezentuje hlavně **MC Gey**, jehož tvorba je postavená na absurdním humoru, parodii a hře s rapovými konvencemi.`,
  },

  'conscious-rap': {
    title: 'Conscious Rap',
    description: 'Conscious rap je hip hop s poselstvím — texty o společnosti, politice, identitě a osobním růstu místo flexu a materialismu.',
    body: `**Conscious rap** je návrat ke kořenům hip hopu jako hlasu ulice a nástroje společenské kritiky. Texty řeší nerovnost, politiku, duševní zdraví a hledání smyslu.

## Charakteristika

- společensky angažované texty
- důraz na poselství
- často introspektivní
- blízko k boom bapu a alternativě

## Česká scéna

Conscious rap v Česku reprezentují **Blako** a **Marcus Revolta** — oba s texty, které jdou pod povrch a řeší víc než jen "prachy, auta, hadry".`,
  },

  'czech-pop': {
    title: 'Czech Pop',
    description: 'Czech pop není rapový žánr, ale v kontextu 4rap.cz označuje interprety a skladby na pomezí popu a hip hopu.',
    body: `**Czech pop** v kontextu české rapové scény označuje interprety, kteří přirozeně propojují popové melodie s rapovým flow a produkcí. Nejde o čistý pop — je to crossover, který funguje oběma směry.

## Charakteristika

- melodické refrény
- rapové sloky
- široký mainstreamový appeal
- častá rádiová rotace

## Česká scéna

Czech pop je v Česku úzce propojený s rapem — interpreti jako Ben Cristovao, Calin nebo Viktor Sheen přirozeně míchají pop s rapem a vytvářejí žánr, který definuje český mainstream.`,
  },

  'czech-rap': {
    title: 'Czech Rap',
    description: 'Czech rap je souhrnné označení pro českou rapovou scénu — od undergroundu po mainstream, od boom bapu po trap.',
    body: `**Czech rap** není jeden žánr, ale střecha pro všechno, co se v Česku děje pod hlavičkou rapu a hip hopu. Od PSH po Milion+, od undergroundu po O2 arenu.

## Charakteristika

- čeština jako hlavní jazyk
- lokální témata a reference
- široké žánrové rozpětí
- vlastní historie a vývoj

## Hlavní představitelé

Czech rap zahrnuje desítky interpretů napříč žánry — od **58G** přes **AstralKid22**, **Bobby Blaze**, **DJ Fatte**, **DJ Kadr**, **Labello**, **Loudz1**, **Robin Zoot**, **Samey** až po **TK27**. Každý z nich reprezentuje jinou větev českého rapu.

## Alba a skladby

Mezi klíčová alba patří **F4R4on** a **[Gudlak]**, mezi zásadní skladby **Erupce**, **Eskort** a **Habibi (Remix)**.`,
  },

  'dance-rap': {
    title: 'Dance Rap',
    description: 'Dance rap spojuje hip hop s taneční hudbou — čtyřdobý beat, chytlavé hooky a energie na parket.',
    body: `**Dance rap** je přesně to, co název slibuje — rap, který tě dostane do pohybu. Vznikl v 80. letech a dodnes je základem klubového hip hopu.

## Charakteristika

- taneční beaty (4/4)
- chytlavé refrény
- energie na parket
- crossover s house a electro

## Česká scéna

V Česku dance rap reprezentuje **Porsche Boy**, jehož tvorba staví na taneční energii a klubovém zvuku.`,
  },

  'dancehall': {
    title: 'Dancehall',
    description: 'Dancehall je jamajský hudební styl s výrazným rytmem, který ovlivnil rap, pop i elektronickou hudbu po celém světě.',
    body: `**Dancehall** vznikl na Jamajce v 80. letech jako odnož reggae. Jeho rytmus a energie ovlivnily hip hop, grime, afrobeats i pop — a dodnes je základem karibské hudební identity.

## Charakteristika

- výrazný riddim
- rychlé deejay vokály
- taneční energie
- blízko k reggae a ragga

## Česká scéna

Dancehall není v Česku dominantní, ale jeho vliv je cítit u interpretů, kteří pracují s karibskými rytmy. Na 4rap.cz je zastoupen skrze **Young Leosia**.`,
  },

  'dark-trap': {
    title: 'Dark Trap',
    description: 'Dark trap je temnější odnož trapu s industriálními beaty, horrorovými sampley a agresivním flow.',
    body: `**Dark trap** bere trapovou formuli a posouvá ji do temnějších vod. Místo melodií jsou tu disonantní synťáky, místo chytlavých hooků agresivní rap a atmosféra, která připomíná horrorcore.

## Charakteristika

- temné, industriální beaty
- horrorové sampley
- agresivní flow
- blízko k horrorcoru a trap metalu

## Česká scéna

Dark trap v Česku nemá samostatnou scénu, ale jeho prvky najdeš u interpretů, kteří kombinují trap s temnější estetikou — často na pomezí trapu a horrorcoru.`,
  },

  'drum-and-bass': {
    title: 'Drum and Bass',
    description: 'Drum and bass je elektronický žánr s rychlými breakbeaty a hlubokými basy, který se často prolíná s rapem.',
    body: `**Drum and bass** (DnB) vznikl v UK v 90. letech jako evoluce jungle a rave scény. Jeho rychlé breaky a basové linky z něj dělají jeden z nejenergičtějších tanečních žánrů.

## Charakteristika

- 160-180 BPM
- rychlé breakbeaty
- hluboké sub-basy
- časté MC vokály

## Česká scéna

Drum and bass má v Česku silnou scénu, ale na pomezí s rapem stojí **Gleb**, který propojuje DnB beaty s rapovým flow.`,
  },

  'east-coast-rap': {
    title: 'East Coast Rap',
    description: 'East coast rap je klasický hip hopový styl z východního pobřeží USA — důraz na lyriku, storytelling a boom bap beaty.',
    body: `**East coast rap** je kolébka hip hopu. New York, Boston, Philadelphia — tady to všechno začalo. Od Kool Herca po Nas, od Wu-Tang po Jay-Z. Východní pobřeží je synonymem pro lyrický rap a boom bap.

## Charakteristika

- důraz na text a flow
- boom bap beaty
- storytelling
- časté jazzové a soulové samply

## Česká scéna

East coast rap ovlivnil celou generaci českých rapperů. Na 4rap.cz ho reprezentují **Big Boy Kea** a **DJ Wich** — oba s hlubokým respektem k východní škole.`,
  },

  'experimental-hip-hop': {
    title: 'Experimental Hip Hop',
    description: 'Experimental hip hop posouvá hranice žánru — nekonvenční produkce, avantgardní přístup a ochota riskovat.',
    body: `**Experimental hip hop** je laboratoř. Producenti a rappeři, kteří odmítají psaná i nepsaná pravidla a hledají nové zvuky, struktury a formy.

## Charakteristika

- nekonvenční beaty
- avantgardní přístup
- časté crossover s jinými žánry
- důraz na originalitu

## Česká scéna

V Česku experimental hip hop reprezentuje **BADBOY BERLIN**, jehož tvorba se vymyká jakékoli škatulce a balancuje na hraně rapu, elektroniky a performance.`,
  },

  'experimental-rap': {
    title: 'Experimental Rap',
    description: 'Experimental rap zahrnuje rappery, kteří vědomě boří konvence — neobvyklé flow, netradiční beaty a odvahu experimentovat.',
    body: `**Experimental rap** je blízký příbuzný experimental hip hopu, ale s větším důrazem na vokální projev. Rappeři v tomto žánru často pracují s neobvyklými flow, polyrytmy a netradiční strukturou textů.

## Charakteristika

- nekonvenční flow
- experimentální produkce
- ochota riskovat
- DIY přístup

## Česká scéna

Experimental rap v Česku reprezentují **Arleta**, **D Ritch**, **DJ AKA**, **Fobia Kid** a **Kamil Hoffmann** — každý z nich jiným způsobem, ale všichni s odvahou jít proti proudu.

Mezi klíčová alba patří **Chimera Pt. 3**, mezi zásadní skladby **Gesta**.`,
  },

  'freestyle-rap': {
    title: 'Freestyle Rap',
    description: 'Freestyle rap je improvizovaný rap bez předem napsaného textu — čistá dovednost, přítomnost a kreativita v reálném čase.',
    body: `**Freestyle rap** je nejčistší forma rapu. Žádný papír, žádný notes, žádný autotune — jen MC, beat a přítomnost. Schopnost rýmovat v reálném čase je základní dovednost, která odděluje rappery od těch, co si jen hrají.

## Charakteristika

- improvizace v reálném čase
- důraz na flow a rýmy
- často battle kontext
- test skutečné dovednosti

## Česká scéna

Freestyle má v Česku dlouhou tradici — od battle scény po klubové freestyle session. Na 4rap.cz ho reprezentuje **Blako**, známý svou schopností improvizovat.`,
  },

  'glitch-hop': {
    title: 'Glitch Hop',
    description: 'Glitch hop kombinuje hip hopové beaty s glitchovou estetikou — digitální zkreslení, liché rytmy a experimentální zvuk.',
    body: `**Glitch hop** vznikl v 90. letech jako fúze hip hopu a IDM (intelligent dance music). Místo čistých beatů jsou tu zkreslené, "rozlámané" zvuky, které připomínají digitální chybu.

## Charakteristika

- glitchové efekty a zkreslení
- liché rytmické patterny
- experimentální produkce
- blízko k IDM a trip hopu

## Česká scéna

Glitch hop není v Česku samostatná scéna, ale jeho prvky najdeš u producentů, kteří kombinují elektroniku s hip hopem. Hlavním představitelem je **Gleb**.`,
  },

  'hardcore-punk': {
    title: 'Hardcore Punk',
    description: 'Hardcore punk není rap, ale jeho energie, DIY étos a agresivita zásadně ovlivnily rapovou scénu — od Beastie Boys po death grips.',
    body: `**Hardcore punk** je sice primárně rockový žánr, ale jeho vliv na hip hop je nezpochybnitelný. Rychlost, agresivita, DIY přístup a anti-establishment postoj — to jsou hodnoty, které oba žánry sdílejí.

## Charakteristika

- vysoké tempo
- agresivní zvuk
- DIY étos
- anti-establishment texty

## Česká scéna

V Česku stojí na pomezí hardcore punku a rapu **DEJV**, který propojuje energii obou žánrů.`,
  },

  'hardcore-rap': {
    title: 'Hardcore Rap',
    description: 'Hardcore rap je agresivní, nekompromisní podoba hip hopu — tvrdé beaty, ostré texty a syrová energie.',
    body: `**Hardcore rap** není žánr pro slabé povahy. Tvrdé beaty, agresivní flow, texty o pouliční realitě a životě bez příkras. Od Schoolly D po DMX, od Onyx po MOP.

## Charakteristika

- agresivní flow a přednes
- tvrdé, minimalistické beaty
- syrové, nefiltrované texty
- energie a intenzita

## Česká scéna

Hardcore rap má v Česku silné zastoupení. Reprezentují ho **Big Boy Kea**, **Chacharski**, **David Beng Rostaš**, **DJ Fatte**, **Řezník** a **Serega**.

Mezi klíčová alba patří **RIOT**, mezi zásadní skladby **Erupce**.`,
  },

  'house-rap': {
    title: 'House Rap',
    description: 'House rap spojuje hip hop s house music — čtyřdobý beat, vokály a klubová energie.',
    body: `**House rap** je přirozený crossover mezi rapem a house music. Vznikl v 80. letech v chicagských klubech a dodnes je základem tanečního hip hopu.

## Charakteristika

- 4/4 house beat
- rapové vokály
- klubová energie
- časté sampley

## Česká scéna

V Česku house rap reprezentuje **Porsche Boy**, který propojuje taneční beaty s rapovým flow.`,
  },

  'jazz-rap': {
    title: 'Jazz Rap',
    description: 'Jazz rap propojuje hip hop s jazzem — živé nástroje, komplexní harmonie a intelektuální texty.',
    body: `**Jazz rap** je jedním z nejrespektovanějších subžánrů hip hopu. Od Gang Starr po A Tribe Called Quest, od Digable Planets po Madliba — jazz a rap k sobě patří od začátku.

## Charakteristika

- jazzové samply a živé nástroje
- komplexní harmonie
- intelektuální texty
- často boom bap beaty

## Česká scéna

Jazz rap v Česku reprezentuje **Yambro**, jehož tvorba staví na jazzových samplech a promyšlených textech.`,
  },

  'lyrical-rap': {
    title: 'Lyrical Rap',
    description: 'Lyrical rap klade důraz na textařské řemeslo — komplexní rýmy, slovní hříčky a propracovaný storytelling.',
    body: `**Lyrical rap** je o řemesle. O schopnosti poskládat slova tak, aby rýmovala, dávala smysl a zároveň zněla přirozeně. O interních rýmech, multisylabických patternách a slovních hříčkách.

## Charakteristika

- komplexní rýmové struktury
- slovní hříčky a wordplay
- propracovaný storytelling
- důraz na textařské řemeslo

## Česká scéna

Lyrical rap v Česku reprezentují **Labello** a **Robin Zoot** — oba známí svou prací s jazykem a propracovanými texty.`,
  },

  'mainstream-rap': {
    title: 'Mainstream Rap',
    description: 'Mainstream rap je komerčně nejúspěšnější podoba hip hopu — chytlavé hooky, rádiový sound a široký appeal.',
    body: `**Mainstream rap** je to, co slyšíš v rádiu, na Spotify playlistech a v klubu. Není to nadávka — je to realita hudebního byznysu. Mainstream rap definuje, co je zrovna populární.

## Charakteristika

- chytlavé melodie a hooky
- rádiový sound
- široký appeal
- častá spolupráce s popem

## Česká scéna

Mainstream rap v Česku zahrnuje interprety jako Viktor Sheen, Calin, Ben Cristovao nebo Yzomandias — jména, která plní O2 arenu a dominují streamovacím žebříčkům.`,
  },

  'melodic-rap': {
    title: 'Melodic Rap',
    description: 'Melodic rap kombinuje rapový flow s melodickým zpěvem — autotune, emotivní refrény a crossover s popem a R&B.',
    body: `**Melodic rap** je dominantní styl současného hip hopu. Od Young Thuga po Juice WRLD, od Post Malone po Travis Scotta — melodie a rap jsou dnes neoddělitelné.

## Charakteristika

- melodický zpěv v refrénech
- autotune jako nástroj
- emotivní, osobní texty
- crossover s popem a R&B

## Česká scéna

Melodic rap v Česku reprezentují **Koukr**, **Meizyy** a **Vlaďkysyn**. Mezi klíčová alba patří **POPSTAR**.`,
  },

  'nu-metal': {
    title: 'Nu Metal',
    description: 'Nu metal je fúze heavy metalu s hip hopem — těžké kytary, rapové vokály a agresivní energie.',
    body: `**Nu metal** definoval zvuk přelomu tisíciletí. Kapely jako Linkin Park, Limp Bizkit, Slipknot nebo Korn spojily těžké kytarové riffy s rapovým flow a vytvořily žánr, který ovládl svět.

## Charakteristika

- těžké kytarové riffy
- rapové vokály
- agresivní energie
- crossover metal-rap

## Česká scéna

V Česku stojí na pomezí nu metalu a rapu **Redzed**, který propojuje metalovou agresivitu s rapovým flow.`,
  },

  'oriental-rap': {
    title: 'Oriental Rap',
    description: 'Oriental rap integruje prvky blízkovýchodní a severoafrické hudby — tradiční nástroje, melodie a rytmy.',
    body: `**Oriental rap** je globální fenomén, který propojuje hip hop s hudební tradicí Blízkého východu a severní Afriky. Od arabských maqam po turecké saz, od indických rág po perské melodie.

## Charakteristika

- orientální melodie a stupnice
- tradiční nástroje (oud, saz, darbuka)
- propojení s world music
- často dvojjazyčné texty

## Česká scéna

V Česku oriental rap reprezentuje skladba **Habibi (Remix)**, která propojuje orientální melodie s českým rapem.`,
  },

  'party-rap': {
    title: 'Party Rap',
    description: 'Party rap je hip hop pro zábavu — chytlavé beaty, jednoduché hooky a texty o tanci, pití a dobré náladě.',
    body: `**Party rap** není o hloubce — je o energii. O chytlavých refrénech, které si každý zapamatuje po prvním poslechu, a o beatách, které rozpumpují každý klub.

## Charakteristika

- chytlavé, jednoduché hooky
- taneční beaty
- texty o zábavě a užívání si
- klubová energie

## Česká scéna

Party rap v Česku reprezentuje skladba **Habibi (Remix)**, která kombinuje orientální melodie s taneční energií.`,
  },

  'psychedelic-rap': {
    title: 'Psychedelic Rap',
    description: 'Psychedelic rap kombinuje hip hop s psychedelickou hudbou — warpované beaty, trippy efekty a texty o změněných stavech vědomí.',
    body: `**Psychedelic rap** je cesta do nitra. Warpované beaty, psychedelické sampley, texty o vědomí, existenci a transcendování reality. Od OutKast po Flatbush Zombies.

## Charakteristika

- psychedelické sampley a efekty
- trippy, warpovaná produkce
- texty o změněných stavech
- často temná atmosféra

## Česká scéna

V Česku psychedelic rap reprezentuje **Alla Xul Elu**, jehož tvorba kombinuje temné beaty s okultní a psychedelickou estetikou.`,
  },

  'punk': {
    title: 'Punk',
    description: 'Punk není rap, ale jeho energie, rychlost a anti-establishment postoj zásadně ovlivnily hip hop od jeho počátků.',
    body: `**Punk** a hip hop mají víc společného, než se zdá. Oba žánry vznikly jako hlas frustrované mládeže, oba staví na DIY étosu a oba odmítají autority. Od Beastie Boys po Death Grips — hranice mezi punkem a rapem je tenčí, než si myslíš.

## Charakteristika

- rychlé tempo
- agresivní energie
- DIY přístup
- anti-establishment

## Česká scéna

V Česku stojí na pomezí punku a rapu **DEJV**, který propojuje energii obou žánrů.`,
  },

  'punk-rap': {
    title: 'Punk Rap',
    description: 'Punk rap je přímý crossover mezi punk rockem a hip hopem — kytarové riffy, rapové vokály a syrová energie.',
    body: `**Punk rap** je přesně to, co název slibuje — punková energie s rapovým flow. Od Beastie Boys po Death Grips, od Transplants po Machine Gun Kellyho.

## Charakteristika

- punkové kytarové riffy
- rapové vokály
- syrová, nekompromisní energie
- DIY přístup

## Česká scéna

V Česku punk rap reprezentuje **Fvck_Kvlt**, který propojuje punkovou agresivitu s rapovým flow.`,
  },

  'rage': {
    title: 'Rage',
    description: 'Rage je nejnovější vlna trapu — agresivní, energetická, postavená na výrazných 808 a jednoduchých, ale účinných melodiích.',
    body: `**Rage** je zvuk generace TikTok. Vznikl kolem roku 2020 jako evoluce trapu a SoundCloud rapu. Agresivní, jednoduchý, přímočarý — žádné složité texty, jen energie a dropy.

## Charakteristika

- výrazné 808 basy
- jednoduché, úderné melodie
- agresivní, energický flow
- krátké, úderné skladby

## Česká scéna

Rage v Česku reprezentuje **G1nter** a album **KRTEK MONEY LIFE** — čistá energie bez zbytečných okras.`,
  },

  'rap-metal': {
    title: 'Rap Metal',
    description: 'Rap metal kombinuje těžké metalové kytary s rapovým vokálem — agresivní fúze dvou zdánlivě neslučitelných světů.',
    body: `**Rap metal** je blízký příbuzný nu metalu, ale s větším důrazem na rapový vokál. Kapely jako Rage Against the Machine, Body Count nebo (hed) PE položily základy žánru v 90. letech.

## Charakteristika

- těžké kytarové riffy
- rapový vokál jako hlavní prvek
- politické a společenské texty
- agresivní energie

## Česká scéna

V Česku rap metal reprezentuje **Redzed**, který propojuje metalovou agresivitu s rapovým flow.`,
  },

  'reggaeton': {
    title: 'Reggaeton',
    description: 'Reggaeton je latinskoamerický hudební styl s výrazným dembow rytmem, který ovlivnil globální pop i hip hop.',
    body: `**Reggaeton** vznikl v Portoriku v 90. letech a dnes je jedním z nejposlouchanějších žánrů na světě. Jeho dembow rytmus a chytlavé melodie ovlivnily pop, rap i elektronickou hudbu.

## Charakteristika

- výrazný dembow rytmus
- chytlavé melodie
- španělské texty
- taneční energie

## Česká scéna

Reggaeton není v Česku dominantní, ale jeho vliv je cítit u interpretů, kteří pracují s latinskoamerickými rytmy. Na 4rap.cz ho reprezentuje **Čistychov**.`,
  },

  'road-rap': {
    title: 'Road Rap',
    description: 'Road rap je britský subžánr grime a UK drill — syrové texty o pouličním životě, minimalistické beaty a autentická výpověď.',
    body: `**Road rap** je britská odpověď na gangsta rap. Vznikl v Londýně jako odnož grime a UK drill, ale s větším důrazem na storytelling a reálné příběhy z ulice.

## Charakteristika

- syrové, autentické texty
- minimalistické, temné beaty
- britský slang a akcent
- blízko k grime a drillu

## Česká scéna

Road rap není v Česku samostatná scéna, ale jeho vliv je cítit u interpretů, kteří čerpají z UK scény. Hlavním představitelem je **Big Narstie**.`,
  },

  'sad-rap': {
    title: 'Sad Rap',
    description: 'Sad rap je emotivní podoba hip hopu — texty o depresi, ztrátě, osamělosti a duševním zdraví, často s melodickým zpěvem.',
    body: `**Sad rap** (také emo rap nebo SoundCloud rap) je hlas generace, která vyrůstala s internetem a otevřeně mluví o duševním zdraví. Od XXXTentacion po Juice WRLD, od Lil Peep po $uicideboy$.

## Charakteristika

- texty o depresi a úzkosti
- melodický, často autotunový zpěv
- lo-fi produkce
- osobní, intimní výpověď

## Česká scéna

Sad rap v Česku reprezentuje **Pil C**, jehož tvorba je postavená na otevřených výpovědích o duševním zdraví a osobních démonech.`,
  },

  'slovak-rap': {
    title: 'Slovak Rap',
    description: 'Slovak rap zahrnuje slovenskou rapovou scénu — od undergroundu po mainstream, od bratislavského boom bapu po východní trap.',
    body: `**Slovak rap** je samostatná větev hip hopu s vlastní historií, hrdiny a zvukem. Od bratislavské školy (Vec, H16) po současný trap (Separ, Pil C) — slovenská scéna má co nabídnout.

## Charakteristika

- slovenština jako hlavní jazyk
- vlastní historie a vývoj
- silná bratislavská scéna
- propojení s českou scénou

## Česká scéna

Slovak rap je na 4rap.cz zastoupen skrze **David Beng Rostaš**, který reprezentuje slovenskou rapovou scénu.`,
  },

  'soul': {
    title: 'Soul',
    description: 'Soul není rap, ale jeho vliv na hip hop je zásadní — soulové samply tvoří základ tisíců rapových beatů.',
    body: `**Soul** a hip hop jsou nerozlučně spojené. Od prvních breakbeatů po současnost — soulové samply tvoří základ hip hopové produkce. Al Green, James Brown, Curtis Mayfield — to jsou jména, bez kterých by hip hop neexistoval.

## Charakteristika

- emotivní vokály
- bohaté harmonie
- gospelové kořeny
- zásadní vliv na hip hop

## Česká scéna

Soul v kontextu českého rapu reprezentuje **Yambro**, který do své tvorby integruje soulové prvky a sampley.`,
  },

  'spoken-word': {
    title: 'Spoken Word',
    description: 'Spoken word je mluvené slovo na pomezí poezie a performance — přednes bez beatů, důraz na text a emoci.',
    body: `**Spoken word** není rap v tradičním slova smyslu — chybí mu beat a pravidelný rytmus. Ale jeho vliv na hip hop je zásadní. Od Gil Scott-Herona po Kate Tempest — mluvené slovo a rap jsou dvě strany téže mince.

## Charakteristika

- mluvený přednes bez beatů
- důraz na text a emoci
- performance aspekt
- blízko k poezii

## Česká scéna

V Česku stojí na pomezí spoken wordu a rapu **D Ritch**, jehož tvorba balancuje mezi rapem, poezií a performance artem.`,
  },

  'street-rap': {
    title: 'Street Rap',
    description: 'Street rap je syrová, autentická podoba hip hopu — beaty z ulice, texty ze života, žádné příkrasy.',
    body: `**Street rap** není žánr, který bys našel v rádiu. Je to rap z ulice, pro ulici. Syrový, nekompromisní, autentický. Od pouličních beatů po texty, které reflektují realitu bez cenzury.

## Charakteristika

- syrová, minimalistická produkce
- autentické, nefiltrované texty
- undergroundový duch
- důraz na realitu před show

## Česká scéna

Street rap v Česku reprezentují **58G**, **Chacharski**, **Kamil Hoffmann**, **Press Premium**, **Serega** a **TK27**. Mezi klíčová alba patří **Medusa** a **Produkt**.`,
  },

  'trap-metal': {
    title: 'Trap Metal',
    description: 'Trap metal je agresivní fúze trapu a metalu — 808 basy, kytarové riffy a screamované vokály v jednom.',
    body: `**Trap metal** je žánr pro ty, kterým je trap moc měkký a metal moc pomalý. Vznikl na SoundCloudu kolem roku 2015 a rychle si našel publikum mezi fanoušky extrémní hudby.

## Charakteristika

- 808 basy z trapu
- kytarové riffy z metalu
- screamované i rapové vokály
- agresivní, nekompromisní energie

## Česká scéna

V Česku trap metal reprezentuje **Redzed**, který propojuje trapové beaty s metalovou agresivitou.`,
  },

  'turntablism': {
    title: 'Turntablism',
    description: 'Turntablism je umění používat gramofony jako hudební nástroj — scratching, beat juggling a mixování.',
    body: `**Turntablism** je jeden ze čtyř pilířů hip hopu (vedle MCing, graffiti a breakdance). DJové, kteří posunuli hranice toho, co jde s gramofonem dělat — od Kool Herca po Grandmaster Flash, od Q-Bert po DJ Shadow.

## Charakteristika

- scratching jako hlavní nástroj
- beat juggling
- mixování a blending
- technická preciznost

## Česká scéna

Turntablism má v Česku silnou tradici. Hlavním představitelem je **DJ Fatte**, který patří k nejrespektovanějším DJům na české scéně.`,
  },

  'underground-hip-hop': {
    title: 'Underground Hip Hop',
    description: 'Underground hip hop je nezávislá větev hip hopu mimo mainstream — DIY přístup, autenticita a komunita.',
    body: `**Underground hip hop** není žánr, ale postoj. Nezávislost na labelech, odmítání mainstreamových formulí, důraz na komunitu a autenticitu. Od bootleg kazet po Bandcamp — underground je srdce hip hopu.

## Charakteristika

- nezávislá produkce a distribuce
- DIY přístup
- důraz na autenticitu
- komunita před komercí

## Česká scéna

Underground hip hop v Česku reprezentuje **Ariez Baby**, který staví na nezávislosti a autenticitě.`,
  },

  'underground-rap': {
    title: 'Underground Rap',
    description: 'Underground rap je syrová, nezávislá podoba rapu mimo mainstreamové struktury — autenticita, DIY a komunita.',
    body: `**Underground rap** je nejčistší forma hip hopu. Žádný A&R, žádný marketingový plán, žádné kompromisy. Jen MC, beat a poselství. Od kazetových dem po Bandcamp releasy.

## Charakteristika

- nezávislá produkce
- autentické, nefiltrované texty
- DIY distribuce
- komunita před komercí

## Česká scéna

Underground rap má v Česku silnou a živou scénu. Reprezentují ho **58G**, **Alla Xul Elu**, **BADBOY BERLIN**, **Blako**, **Bobby Blaze**, **David Beng Rostaš**, **DJ AKA**, **DJ Fatte**, **DJ Kadr**, **DJ Wich**, **Kamil Hoffmann**, **Labello**, **Loudz1**, **Protiva**, **Robin Zoot**, **Samey**, **TK27** a **Tyler Durden**.

Mezi klíčová alba patří **F4R4on**, mezi zásadní skladby **Erupce** a **Eskort**.`,
  },

  'underground-rock': {
    title: 'Underground Rock',
    description: 'Underground rock je nezávislá rocková scéna mimo mainstream — garážový zvuk, DIY étos a syrová energie.',
    body: `**Underground rock** sdílí s hip hopem víc, než se zdá. Stejný DIY přístup, stejná nezávislost na mainstreamu, stejná komunita. Od garážových zkoušek po nezávislé releasy.

## Charakteristika

- garážový, syrový zvuk
- DIY přístup
- nezávislost na labelech
- komunita před komercí

## Česká scéna

V Česku stojí na pomezí underground rocku a rapu **DEJV**, který propojuje energii obou světů.`,
  },
}

// ─── Generate pages ───────────────────────────────────────────

let created = 0
let skipped = 0

for (const [slug, data] of Object.entries(CONTENT)) {
  if (existingSlugs.has(slug)) {
    skipped++
    continue
  }

  const entityData = genreMap[slug] || { rappers: [], albums: [], tracks: [] }

  // Build interlinking sections
  let interlinks = ''

  if (entityData.rappers.length > 0) {
    interlinks += '\n## Interpreti na 4rap.cz\n\n'
    for (const r of entityData.rappers) {
      interlinks += `- [${r.title}](/raperi/${r.slug})\n`
    }
  }

  if (entityData.albums.length > 0) {
    interlinks += '\n### Alba\n\n'
    for (const a of entityData.albums) {
      interlinks += `- [${a.title}](/alba/${a.slug})\n`
    }
  }

  if (entityData.tracks.length > 0) {
    interlinks += '\n### Skladby\n\n'
    for (const t of entityData.tracks) {
      interlinks += `- [${t.title}](/skladby/${t.slug})\n`
    }
  }

  const body = data.body + interlinks + '\n\n## Související žánry\n\n'

  const content = `---
title: "${data.title}"
slug: "${slug}"
description: "${data.description}"
image: "/images/zanry/${slug}.jpg"
publishedAt: "2026-06-06"
---

${body}
`

  writeFileSync(join('content/zanry', `${slug}.mdx`), content, 'utf-8')
  created++
  console.log(`✅ Vytvořeno: ${slug} — ${data.title}`)
}

console.log(`\nVytvořeno: ${created}, Přeskočeno (už existuje): ${skipped}`)
