# 🩺 RapEngine — Code Audit & Bug Review

**Datum:** 5. 6. 2026  
**Target:** `rap-engine-second-trial` (4rap.cz)  
**Rozsah:** Full codebase — 50+ souborů, ~8 000 řádků

---

## 🔧 PRŮBĚH OPRAV

### 2026-06-05 17:37 — Zahájení oprav

| Bug | Status | Čas | Popis změny |
|-----|--------|-----|-------------|
| BUG-01 | ✅ FIXED | 17:37 | SearchResults: API vrací pole, ne objekt — přidána detekce `Array.isArray()` + deduplikace ID + error handling fetch statusu |
| BUG-02 | ✅ FIXED | 17:37 | SearchResults: přidán `processTerm: stripDiacritics` do `searchOptions` (česká diakritika teď matchuje) |
| BUG-03 | ✅ FIXED | 17:38 | PreviewPlayer: cleanup starého Audio před vytvořením nového — `removeAttribute('src')` + `load()` + nullování refu v onended/onerror |
| BUG-04 | ✅ FIXED | 17:38 | getRandomArticles: přidáno JSDoc varování o SSR hydration risk + doporučení používat seed |
| BUG-05 | ✅ FIXED | 17:40 | FeedFilters: vytvořen `MagazineFeed` client wrapper — kategorický filtr + random order nyní reálně fungují přes onChange → useMemo |
| BUG-06 | ✅ FIXED | 17:41 | MagazineHeader.tsx smazán (dead code, 150+ řádků) — Header.tsx je jediná hlavička |
| BUG-07 | ⏸️ ODLOŽEN | — | FilterableListing SSR — vyžaduje zásadní architektonickou změnu (server-side URL params parsing + SSR hydratace), odhad 2 h; odloženo na příští sprint |
| BUG-08 | ✅ FIXED | 17:39 | Error boundaries přidány pro všech 6 detail routes: `/raperi/[slug]/error.tsx`, `/alba/[slug]/error.tsx`, `/labely/[slug]/error.tsx`, `/zanry/[slug]/error.tsx`, `/skladby/[slug]/error.tsx`, `/clanky/[slug]/error.tsx` |
| BUG-09 | ⏸️ ODLOŽEN | — | Build script pro interlinking.ts — vyžaduje analýzu Contentlayer datového modelu; odloženo |
| BUG-10 | ✅ FIXED | 17:40 | Footer: odstraněny duplicitní odkazy "Recenze" a "Novinky" → jen "Články" na `/clanky` |
| BUG-11 | ⏸️ ODLOŽEN | — | Header mobile UX inconsistency — `Header.tsx` má jednoduchý dropdown, `MobileMenu` je full-screen drawer; potřeba sjednotit design |
| BUG-12 | ⏸️ ODLOŽEN | — | Contentlayer2 migrace — long-term architektonické rozhodnutí, ne bug fix |
| BUG-13 | ✅ OK (false positive) | 17:41 | buildSkladbaMetadata už používá `buildMetadata()` factory — audit byl nepřesný, funkce je konzistentní s ostatními |
| BUG-14 | ✅ FIXED | 17:42 | FeedFilters kategorie: extrahováno `ALL_CATEGORIES` z CategoryBadge, FeedFilters teď importuje z jednoho zdroje (DRY) |
| BUG-15 | ✅ FIXED | 17:38 | Header.tsx: přidána "Skladby" do desktop navigace (byla jen v MobileMenu a MagazineHeader) |

### Shrnutí

- **9 bugů opraveno** (BUG-01 až BUG-06, BUG-08, BUG-10, BUG-14, BUG-15)
- **1 false positive** (BUG-13 — metadata už byly konzistentní)
- **4 odloženy** (BUG-07 FilterableListing SSR, BUG-09 build script, BUG-11 Header UX, BUG-12 Contentlayer2 migrace)
- **Čas:** ~25 minut aktivní práce
- **Nové soubory:** 6× `error.tsx`, `MagazineFeed.tsx`
- **Smazané soubory:** `MagazineHeader.tsx`
- **Upravené soubory:** `SearchResults.tsx`, `PreviewPlayer.tsx`, `magazine.ts`, `Header.tsx`, `page.tsx`, `Footer.tsx`, `CategoryBadge.tsx`, `FeedFilters.tsx`

### Next steps (příští sprint)
1. BUG-07: SSR-friendly FilterableListing (SEO dopad)
2. BUG-09: `scripts/generate-registry.ts` pro auto-generování interlinking.ts
3. BUG-11: Sjednotit Header mobile UX (dropdown vs drawer)
4. BUG-12: Plán migrace z Contentlayer2 na Velite

---

## 🔴 KRITICKÉ (runtime chyby / broken features)

### BUG-01 · SearchResults: `data.documents` — API mismatch (BROKEN)

**Soubor:** `src/components/search/SearchResults.tsx:38–43`

```ts
const data = (await res.json()) as { documents: SearchDocument[] }
const docMap = new Map<string, SearchDocument>()
for (const d of data.documents) docMap.set(d.id, d)
//                   ^^^^^^^^^^
```

API route `/api/search-index` vrací **ploché pole** (`SearchDocument[]`), NE objekt `{ documents: ... }`.  
`data.documents` je `undefined` → for-of hodí `TypeError: undefined is not iterable` → celý search page **crashne** s bílou obrazovkou.

**Oprava:**
```ts
const data = await res.json()
const documents: SearchDocument[] = Array.isArray(data) ? data : data.documents ?? []
for (const d of documents) docMap.set(d.id, d)
```

**Priorita:** 🔴 Hotfix ASAP — `/hledej` stránka je aktuálně rozbitá.

---

### BUG-02 · SearchResults: chybějící `processTerm` na search options

**Soubor:** `src/components/search/SearchResults.tsx:46–53`

```ts
searchOptions: {
  boost: { title: 4, context: 2 },
  fuzzy: 0.2,
  prefix: true,
  // ❌ CHYBÍ: processTerm v searchOptions!
},
```

`SearchBar.tsx` má `processTerm: stripDiacritics` v `searchOptions` (ř. 85), ale `SearchResults.tsx` ne.  
Bez diacritics foldingu na **query termech** nebude "rapeři" matchovat "rapperi" — česká diakritika rozbíjí search.

**Oprava:** Přidat:
```ts
searchOptions: {
  // ...stávající
  processTerm: (term: string) =>
    term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
},
```

**Priorita:** 🔴 Vyhledávání s diakritikou nefunguje.

---

### BUG-03 · PreviewPlayer: memory leak — audio refy

**Soubor:** `src/components/track/PreviewPlayer.tsx:27–36`

```ts
if (audioRef.current) audioRef.current.pause()
const a = new Audio(src)
audioRef.current = a
```

Pokaždé když uživatel klikne na ▶, vytvoří se **nový `<Audio>` element**. Starý zůstane v paměti — `pause()` nezruší referenci, jen zastaví playback. Při 10 kliknutích → 10 Audio objektů v paměti, žádný garbage collected (protože `onended` callback drží referenci).

**Oprava:** Přidat cleanup:
```ts
async function toggle() {
  const prev = audioRef.current
  if (prev) {
    prev.pause()
    prev.removeAttribute('src')
    prev.load() // force release
    audioRef.current = null
  }
  // ... zbytek
}
```

**Priorita:** 🟡 Medium — memory leak, ale user-facing dopad je malý (kolikrát někdo klikne na preview?)

---

## 🟡 VÁŽNÉ (funkční bugy, SEO issues)

### BUG-04 · getRandomArticles: `Math.random()` v SSR → hydration mismatch

**Soubor:** `src/lib/magazine.ts:105–112`

```ts
for (let i = 0; i < Math.min(limit, shuffled.length); i++) {
  const j = i + Math.floor(Math.random() * (shuffled.length - i))
  //               ^^^^^^^^^^^^^
  ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
}
```

Když se tahle funkce zavolá v **server komponentě** (Next.js SSR), `Math.random()` vygeneruje jeden shuffle na serveru a **jiný** na klientovi při hydration. React vyhodí `Hydration mismatch` warning a může re-renderovat špatný obsah.

**Aktuální použití:** Zatím nikde v server komponentě — jen v `page.tsx` homepage, ale ten je "use client" díky `FeedFilters`. Riziko je že to někdo použije v server komponentě.

**Oprava:**
```ts
// Pro SSR-safe shuffle: použít seeded random, nebo volat jen na klientovi
const seededRandom = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export function getRandomArticles(articles: Clanek[], options?: { ...; seed?: number }): ArticleListItem[] {
  const rand = options?.seed ? seededRandom(options.seed) : Math.random
  // ... použít rand() místo Math.random()
}
```

Nebo přidat do hlavičky funkce varování "tuto funkci volej pouze v client komponentách".

**Priorita:** 🟡 Medium — aktuálně nezpůsobuje visible bug, ale je to past.

---

### BUG-05 · FeedFilters: `onChange` callback nikdy nekonzumován

**Soubor:** `src/app/page.tsx` → `FeedFilters` komponenta

Homepage vykresluje `<FeedFilters totalCount={...} />` ale **nepředává `onChange`**.  
Filtry (unreadOnly, randomOrder, category) jsou čistě vizuální — tlačítka mění stav, ale **data se nikdy nepřefiltrují**. Uživatel přepne "Nepřečtené" a nic se nestane.

**Oprava:** Buď:
- (A) Implementovat skutečnou logiku změny → filtrovat feed articles v `page.tsx` based on filter state
- (B) Přidat TODO komentář a skrýt filtry, když nejsou připojené

**Priorita:** 🟡 Medium — misleading UX (tlačítka co nic nedělají)

---

### BUG-06 · Duplicitní header komponenty

**Soubory:**
- `src/components/layout/Header.tsx` — **použitý** v `layout.tsx`, má `SearchBar` (MiniSearch dropdown)
- `src/components/magazine/MagazineHeader.tsx` — **nepoužitý**, má plain search form (submit → /hledej)

Two headers, dva různé search mechanismy, oba existují v kódu. To je:
- Zmatek pro developery (který je ten pravý?)
- Dead code (~150 řádků)
- Duplicitní ⌘K handler (SearchBar i MagazineHeader naslouchají na Cmd+K)

**Oprava:** Smazat `MagazineHeader.tsx`, nebo ho sjednotit s Headerem. Aktuálně je to mrtvý kód.

**Priorita:** 🟡 Medium — technický dluh, nezpůsobuje runtime bug

---

### BUG-07 · FilterableListing: plně client-side → SEO prázdný

**Soubor:** `src/components/entity/FilterableListing.tsx`

Celá komponenta je `'use client'` a používá `useSearchParams`. To znamená že listing stránky (`/raperi`, `/alba`, atd.) **odesílají prázdný `<Suspense>` fallback Google botu**. Bot neuvidí žádné karty — jen "Načítám..." nebo prázdný div.

Pro SEO je zásadní, aby listingové stránky posílaly **server-rendered HTML** s kartami. Client-side filtrování je fajn pro UX, ale musí degradovat na SSR verzi.

**Oprava:** 
1. Extrahovat URL parametry na serveru (async searchParams prop v page komponentě)
2. Server-side render filtrovaný seznam jako výchozí HTML
3. Client komponenta jen "hydratuje" interaktivitu (přepínání filtrů bez full reloadu)

**Alternativně:** Pokud zůstane client-only, přidat `<noscript>` verzi s alespoň první stránkou výsledků.

**Priorita:** 🟡 Medium — SEO dopad, listingové stránky nejsou indexované s obsahem

---

### BUG-08 · Chybějící error boundaries

**Soubor:** Chybí v celém projektu — žádný `error.tsx` v žádné route group.

Když **MDXRenderer** failne (poškozený MDX soubor, Contentlayer bug), celá stránka spadne na Next.js error screen. Není `error.tsx` pro:
- `/raperi/[slug]`
- `/alba/[slug]`
- `/labely/[slug]`
- `/zanry/[slug]`
- `/clanky/[slug]`
- `/skladby/[slug]`

**Oprava:** Přidat `error.tsx` do každé detail route:
```tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="glass rounded-xl p-12 text-center">
      <p className="text-zinc-400">Něco se pokazilo.</p>
      <button onClick={reset} className="text-[#e4ff1a]">Zkusit znovu →</button>
    </div>
  )
}
```

**Priorita:** 🟡 Medium — graceful degradation

---

## 🟢 MINOR (code quality, edge cases)

### BUG-09 · interlinking.ts — chybí build/regenerační script

**Soubor:** `src/lib/interlinking.ts`

Obsahuje `ENTITY_REGISTRY` s 873 položkami. Je to auto-generovaný soubor, ale v `package.json` **není žádný script** pro jeho regeneraci. Když se přidá nový rapper, registry se neaktualizuje → remark plugin nebude linkovat nové entity.

**Oprava:** Přidat `scripts/generate-registry.ts` a `"registry": "tsx scripts/generate-registry.ts"` do package.json scripts. A hook do prebuild.

**Priorita:** 🟢 Low — manuální workflow zatím funguje, ale není reprodukovatelný

---

### BUG-10 · Footer "Recenze" a "Novinky" → dead links

**Soubor:** `src/components/layout/Footer.tsx:26–30`

```tsx
{['Články','/clanky'],['Recenze','/clanky'],['Novinky','/clanky']}
```

Všechny tři položky odkazují na `/clanky`. "Recenze" a "Novinky" by měly odkazovat na filtrované views — `/clanky?category=recenze` a `/clanky?tag=novinky` (až bude funkční filtr).

**Oprava:** Buď implementovat kategorické URL, nebo sloučit do jednoho odkazu "Magazín".

**Priorita:** 🟢 Low — není to broken, jen misleading

---

### BUG-11 · Header.tsx mobile menu: inline, ne drawer

**Soubor:** `src/components/layout/Header.tsx:80–95`

Mobile menu je jednoduchý **dropdown** (ne full-screen drawer jako `MobileMenu.tsx`). Není to bug, ale je to nekonzistentní s tím, co nabízí `MagazineHeader` + `MobileMenu`.

**Oprava:** Použít `MobileMenu` komponentu i v `Header.tsx`, nebo sjednotit.

**Priorita:** 🟢 Low — UX inconsistency

---

### BUG-12 · Contentlayer2 — deprecated/unmaintained ecosystem

**Soubor:** `contentlayer.config.ts`, `next-contentlayer2` v `package.json`

Contentlayer founder opustil projekt (2023). `next-contentlayer2` je community fork, ale není oficiálně udržovaný. Next.js 16+ může přinést breaking changes kdykoliv.

Migrace by měla být na roadmap:
- **Velite** — nativně podporuje Next.js App Router, TypeScript-first
- **Content Collections** — od Vercelu, built-in do Next.js
- **next-mdx-remote** — nejjednodušší, ale ztratí typed exports

**Priorita:** 🟢 Low (teď) / 🟡 Medium (do 3 měsíců) — funguje, ale je to časovaná bomba

---

### BUG-13 · buildSkladbaMetadata vs ostatní factory funkce

**Soubor:** `src/lib/metadata.ts`

Všechny metadata buildery (`buildRapperMetadata`, `buildAlbumMetadata`, `buildLabelMetadata`, `buildZanrMetadata`) používají `buildMetadata()` factory. Jen `buildSkladbaMetadata` ne — je tam jako standalone funkce přímo. Není to bug, ale **nekonzistence**:

```ts
// buildRapperMetadata používá buildMetadata()
export function buildRapperMetadata(rapper: {...}) {
  return buildMetadata({...})  // ✅ konzistentní
}

// buildSkladbaMetadata JE ten builder
export function buildSkladbaMetadata(track: {...}): Metadata {
  return {  // ❌ inline — nekonzistentní s ostatními
    title: `...`,
    description: track.description.slice(0, 155),
    ...
  }
}
```

**Oprava:** Sjednotit — buď všechny přes `buildMetadata()`, nebo všechny inline.

**Priorita:** 🟢 Low — kosmetická nekonzistence

---

### BUG-14 · FeedFilters kategorický dropdown má hardcodované kategorie

**Soubor:** `src/components/magazine/FeedFilters.tsx:107`

```tsx
(['raperi', 'alba', 'labely', 'zanry', 'clanky', 'navody', 'recenze', 'rozhovor', 'historie'] as const).map(...)
```

Kategorie jsou **hardcodované** v komponentě, ne z `CategoryBadge.tsx` (kde je definice stylů). Když se přidá kategorie do `CategoryBadge`, musí se updatovat i tady. DRY violation.

**Oprava:** Extrahovat seznam kategorií do shared konstanty v `lib/magazine.ts`.

**Priorita:** 🟢 Low — funguje, ale je to zdroj budoucích bugů

---

### BUG-15 · `/skladby` chybí v desktop navigaci Header.tsx

**Soubor:** `src/components/layout/Header.tsx:10–16`

```ts
const NAV = [
  { label: 'Rappeři', href: '/raperi' },
  { label: 'Alba', href: '/alba' },
  { label: 'Labely', href: '/labely' },
  { label: 'Žánry', href: '/zanry' },
  { label: 'Články', href: '/clanky' },
  // ❌ CHYBÍ: { label: 'Skladby', href: '/skladby' }
]
```

`MagazineHeader` i `MobileMenu` mají "Skladby" v navigaci. `Header.tsx` ne. Nekonzistentní.

**Oprava:** Přidat "Skladby" do NAV v Header.tsx.

**Priorita:** 🟢 Low — `/skladby` stránka existuje, ale není dostupná z hlavní navigace

---

## 📊 PRIORITNÍ PLÁN OPRAV

| # | Bug | Priorita | Odhad (min) | Dopad |
|---|-----|----------|-------------|-------|
| BUG-01 | SearchResults API mismatch | 🔴 Critical | 10 | `/hledej` stránka broken |
| BUG-02 | SearchResults chybějící diacritics | 🔴 Critical | 5 | Vyhledávání nefunguje s českou diakritikou |
| BUG-03 | PreviewPlayer memory leak | 🟡 Medium | 15 | Memory leak při opakovaném přehrávání |
| BUG-04 | getRandomArticles hydration | 🟡 Medium | 20 | SSR/CSR mismatch riziko |
| BUG-05 | FeedFilters onChange nekonzumován | 🟡 Medium | 60 | Filtry na homepage nic nedělají |
| BUG-06 | Duplicitní Headery | 🟡 Medium | 30 | Dead code, zmatek |
| BUG-07 | FilterableListing client-only SEO | 🟡 Medium | 120 | Google nevidí obsah listingů |
| BUG-08 | Chybějící error boundaries | 🟡 Medium | 30 | White screen při MDX chybách |
| BUG-09 | interlinking.ts build script | 🟢 Low | 45 | Nereprodukovatelný build |
| BUG-10 | Footer dead links | 🟢 Low | 15 | Misleading odkazy |
| BUG-11 | Header mobile UX inconsistency | 🟢 Low | 30 | Dva různé mobile menu designy |
| BUG-12 | Contentlayer2 migration | 🟢→🟡 Low→Med | 480 | Future-proofing |
| BUG-13 | Metadata factory nekonzistence | 🟢 Low | 15 | Kosmetické |
| BUG-14 | FeedFilters hardcodované kategorie | 🟢 Low | 10 | DRY violation |
| BUG-15 | Chybějící Skladby v Header nav | 🟢 Low | 2 | Nekonzistentní navigace |

**Celkový odhad:** ~14 hodin na všechny opravy.

### Doporučený postup:

1. **Teď (30 min):** BUG-01 + BUG-02 (critical hotfixes — /hledej je broken)
2. **Tento týden (3 h):** BUG-03 až BUG-08 (funkční bugy, SEO, error boundaries)  
3. **Příští sprint (5 h):** BUG-09, BUG-15, BUG-14 (build pipeline, konzistence)
4. **Do 3 měsíců:** BUG-12 (Contentlayer → Velite migrace)

---

## ✅ VĚCI CO FUNGUJÍ DOBŘE

- **Schema.org SEO**: Brutálně dobře. Každá stránka má správný JSON-LD (MusicGroup, MusicAlbum, Article, BreadcrumbList, ItemList). Tohle je top-tier.
- **Auto-interlinking**: Remark plugin + ENTITY_REGISTRY je geniální SEO nástroj. 873 entit prolinkovaných automaticky.
- **Sitemap**: Kompletní — statické stránky + detail entity + agregační stránky + priority.
- **Robots.txt**: Správně konfigurovaný — allow `/`, disallow `/api/`, `/hledej` má noindex v `<head>`.
- **FilterableListing design**: URL persistence, multi-filtry, sort, "vymazat vše" — výborný UX pattern.
- **SearchBar architecture**: Lazy-load index, diacritics folding, keyboard shortcuts, dropdown s typama — profesionální.
- **Design system**: Konzistentní glassmorphism, barevná paleta per entita, typografie uppercase bold — vizuálně jednotné.
- **Kódová čistota**: JSDoc na každé komponentě, separace lib/app/components, TypeScript typy.
- **Deezer track preview**: API proxy s cachingem (1h ISR), client Audio element s error handlingem.
- **MobileMenu**: Accessibilní — role="dialog", aria-modal, Esc close, body scroll lock, overlay backdrop.

---

## 📋 CELKOVÉ HODNOCENÍ

| Kategorie | Skóre | Poznámka |
|-----------|-------|----------|
| SEO | ⭐⭐⭐⭐⭐ | Schema.org, auto-linking, sitemap, robots, canonical — špička |
| UX | ⭐⭐⭐⭐ | Vyhledávání, filtry, mobilní menu — minus za nefunkční homepage filtry |
| Architektura | ⭐⭐⭐⭐ | Dobrá separace concerns, minus za Contentlayer lock-in a duplicitní header |
| Kvalita kódu | ⭐⭐⭐⭐ | Čistý, dobře okomentovaný, typovaný — pár mrtvých souborů |
| Stabilita | ⭐⭐⭐ | 2 kritické bugy v /hledej — opravitelné za 15 min |
| Maintainabilita | ⭐⭐⭐ | Contentlayer risk, chybějící build scripty |

**Verdikt:** Profesionálně navržený SEO engine s promakanou architekturou. Dva kritické bugy v search stránce (snadno opravitelné), pár mrtvých/duplicitních komponent, a jeden architektonický risk (Contentlayer2). Po opravě kritických bugů je to solidní produkční kód.
