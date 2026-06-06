# ARCHITEKTONICKÝ NÁVRH — Čištění a Rozšíření Datového Modelu

Datum: 2026-06-05

## Současný Stav

| Entita | Počet | Problém |
|---|---|---|
| Alba | 589 souborů | **340 z nich jsou singly** (1 track). Jen 245 je reálných alb/EP. |
| Skladby | 2,724 souborů | Žádný nepřekrývá s 340 singly v alba. |
| Rappeři | 227 | 104 stubů, žádná sekce "spolupráce". |
| Extra fieldy | 41 warningů | `id`, `kind`, `meta`, `socials`, `deezerId`, `features`, `aliases`, `subgenres` atd. |

## Problémy k Řešení

### 1. Singly v Alba — Data Model Lež

340 souborů v `content/alba/` jsou singly (mají 1 track). Aktuálně se to řeší hackem — funkce `isSingle()` v kódu, která hledá slovo "singl" v description a filtruje je z listingů. To je křehké, nečitelné a brání správnému dotazování.

**Single ≠ Album.** Single je samostatně vydaná skladba. Patří do `content/skladby/`.

### 2. Tracklisty na Albech — "Mrtvá Data"

Tracklisty v albech jsou plain-text array. Nelinkují na stránky skladeb, přestože 2,724 skladeb už existuje. Každá položka tracklistu by měla odkazovat na `/skladby/[slug]`.

### 3. Kolaborace — Chybějící Funkcionalita

Nikde se neukazují, s kým rapper spolupracoval. Přitom Skladba schema už má `features` i `featuresNames`. Je to zásadní informace pro pochopení propojení scény.

### 4. Deezer API Metadata — Nevyužitá

Soubory obsahují `deezerId` (rapper), `deezerAlbumId` / `upc` (alba), `meta` (rapper), `socials` (rapper) — všechny ignorované Contentlayerem. Datový odpad, který varuje build.

---

## NÁVRH ZMĚN

### Změna 1: Migrace Singlů → Skladby

**Co:** 340 jednodílných souborů přesunout z `content/alba/` → `content/skladby/`.

**Jak:**
- Python migrační script, který:
  1. Vezme každý single v `alba/`
  2. Vytvoří odpovídající `skladby/[slug].mdx`:
     - `title` ← první položka `tracklist`
     - `rapper` / `rapperSlug` ← zachová
     - `features` / `featuresNames` ← zachová
     - `producers` ← zachová
     - `duration` ← zachová
     - `year` ← zachová
     - `genre` ← zachová
     - `image` / `cover` ← zachová (prefer cover)
     - `description` ← zachová
     - `publishedAt` ← zachová
     - Celé MDX tělo ← zachová (analýza, citáty, timeline, FAQ)
  3. Odstraní původní soubor z `alba/`
  4. Pole jako `label`, `labelName`, `rating`, `upc`, `nbTracks`, `releaseDate` se zahodí (jsou album-specifické)

**Schema změna:** Přidat do Skladba:
```typescript
releaseType: { type: 'string', required: false }  // "single" | "album-track"
// + nový field pro deezer track ID
deezerTrackId: { type: 'number', required: false }
```

**Výhody:**
- Data model odpovídá realitě — singly jsou skladby
- Žádný hack `isSingle()` — filtrování přes `releaseType: "single"`
- Všechny singly získají vlastní stránku pod `/skladby/[slug]`
- Bohatý MDX obsah (analýza, citáty, timeline) se neztratí
- Album listing se vyčistí — zobrazí jen opravdová alba (245 místo 589)

### Změna 2: Tracklist → Skladba Linking

**Co:** Každá položka tracklistu na stránce alba je link na `/skladby/[slug]`.

**Jak:**
- Vytvořit lookup map: track-name → skladba-slug (slugify)
- Na `alba/[slug]/page.tsx`: pro každý track v tracklistu najít odpovídající skladbu a vykreslit jako link
- Zobrazit: `#num. Název feat. Features (duration)`
- Pokud skladba neexistuje → plain text (žádný broken link)

**Schema změna:** Žádná — jen nový util `src/lib/track-lookup.ts`:
```typescript
// Mapuje název tracku (slugified) → skladba slug
// Např. "Kruhy & vlny" → "kruhy-a-vlny"
export function findTrackSlug(trackName: string, allSkladby: Skladba[]): string | null
```

**UI změna:** Komponenta `AlbumTracklist` s linky na skladby.

### Změna 3: Kolaborace na Profilu Rapperů

**Co:** Na stránce `/raperi/[slug]` ukázat výběr kolaborací s možností "všechny kolaborace".

**Jak:**
- Dotaz: všechny Skladby kde `features` obsahuje daný `rapperSlug`
- Na hlavní stránce rappera:
  ```
  ## Spolupráce
  - Separ — "Seda Eminence" (2024)
  - Pil C — "Kariéra není" (2023)
  - Ektor — "Tetris" (2012)
  → [Všechny spolupráce (42)]
  ```
- Nová stránka: `/raperi/[slug]/spoluprace`
  - Filtr + tabulka všech kolaborací
  - Řazení podle roku, popularity, typu

**Potřebné:**
- Nová route: `src/app/raperi/[slug]/spoluprace/page.tsx`
- Query util: `getRapperCollaborations(slug)` v `src/lib/aggregations.ts`

### Změna 4: Deezer Data — Využít nebo Vyčistit

**Možnost A — Vyčistit (doporučuju)**
- Script, co odstraní z frontmatteru všechna pole mimo Contentlayer schema
- Deezer data zůstanou jen v původních zdrojových souborech (import skriptech)
- Build warningy klesnou na 0
- ⚠️ Ztratíme reference na Deezer artwork, IDčka, socials linky

**Možnost B — Začlenit do schematu (střední cesta)**
- Přidat do Rapper: `deezerId`, `socials` (JSON string)
- Přidat do Album: `deezerAlbumId`, `upc`
- Přidat do Skladba: `deezerTrackId`
- Zbytek (`kind`, `id`, `meta.…`, `subgenres`, `aliases`) vyčistit
- ✅ Zachová užitečná Deezer data pro budoucí integraci (embed hráč, metadata lookup)
- ⚠️ Mírně širší schema

**Možnost C — Nechat vše (status quo)**
- 41 warningů zůstává
- Data jsou v souborech, ale Contentlayer je ignoruje
- Nečisté, ale funkční

**Doporučuju možnost B** — `deezerId` a `socials` jsou okamžitě využitelné (embed preview, "poslechnout na Deezeru" tlačítko). `kind`/`id`/`meta.*` jsou redundantní a jdou pryč.

---

## IMPLEMENTAČNÍ PLÁN

### Fáze 1: Schema Changes + Warning Cleanup (30 min)
1. Přidat `releaseType`, `deezerTrackId` do Skladba
2. Přidat `deezerId`, `socials` do Rapper
3. Přidat `deezerAlbumId`, `upc`, `features` do Album
4. Script na vyčištění zbylých extra fieldů z 18 souborů
5. Build → 0 warningů ✅

### Fáze 2: Migrace Singlů (30 min)
1. Python migrační script — 340 souborů
2. Ověření: `npm run build` → správný počet stránek
3. Smazat `isSingle()` hack z kódu
4. Upravit listingy (alba už single neobsahují)

### Fáze 3: Track Linking + Kolaborace (45 min)
1. `track-lookup.ts` util
2. `AlbumTracklist` komponenta
3. Kolaborační sekce na rapper stránce
4. `/raperi/[slug]/spoluprace` stránka

### Fáze 4: Test + Deploy
1. `npm run build` — bez warningů, bez errorů
2. Ruční kontrola 5-10 profilů
3. Git commit

---

## CO SE NEZMĚNÍ

- Adresářová struktura zůstává (`content/raperi/`, `content/skladby/`, atd.)
- URL struktura zůstává (`/skladby/[slug]` pro singly i tracky)
- MDX tělo všech souborů zůstává intaktní
- Interlinking, SEO, Schema.org zůstávají funkční
- Počet stránek zůstane podobný (340 singly se přesune, ale pořád generují stránky)

---

## DATOVÝ DOPAD

| Entita | Před | Po | Rozdíl |
|---|---|---|---|
| Alba | 589 | ~249 (jen alba + EP) | -340 |
| Skladby | 2,724 | ~3,064 | +340 |
| Warningy | 41 | 0 | -41 |
| Static pages | 4,707 | ~4,707 | ~stejný |

---

## OTÁZKY PRO SCHVÁLENÍ

1. **Možnost B pro Deezer data** (začlenit `deezerId` + `socials` do schematu)?
2. **Kolaborace** — stačí sekce na hlavní stránce + "všechny" link, nebo chceš plnohodnotnou `/raperi/[slug]/spoluprace` stránku hned?
3. **Tracklist lookupy** — máme 2,724 skladeb. Je OK že ne každý track z tracklistu bude mít stránku? (Jen ty co existují)
4. Chceš zachovat i `aliases` (umělecká jména) — nebo to řešit přes interlinking?
