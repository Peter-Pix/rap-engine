# 4RAP — Magazine Design v2 (Site-wide)

Aplikuje jednotný magazín design napříč celým webem (`/`, `/raperi`, `/alba`,
`/labely`, `/zanry`, `/skladby`, `/clanky` + všechny detail pages) a přidává
plnohodnotné mobilní menu s inline search (⌘K).

Tahle várka navazuje na předchozí balík `4rap-magazine.zip` — pokud jsi
nasadil tu první iteraci, tahle ji rozšiřuje (nepřepisuje listing/detail pages
co tam ještě nebyly redesignované).

## Co je nového oproti v1

| Vrstva | v1 | v2 |
|---|---|---|
| Homepage (magazín feed) | ✓ Hotové | beze změny |
| **Header** | Sticky, jen logo + ikona search | **Inline search (⌘K), hamburger mobile menu** |
| **Mobile menu** | – | **Full-height slide drawer s emoji ikonami** |
| **Listing pages** | Old style ("Databáze" header + glass cards) | **Nový ListingHero + StatsBar + barevné kickery** |
| **Detail pages** | Old style | **DetailHero + DetailLayout + SidebarCard pattern** |
| **EntityCard** | Glass karta v `/components/entity/` | **Magazine variant v `/components/shared/` (paralelně)** |

## Struktura balíku

```
4rap-magazine-v2/
├── src/
│   ├── components/
│   │   ├── shared/                       ← NOVÉ — sdílené primitivy
│   │   │   ├── MobileMenu.tsx            Mobile drawer s nav + search
│   │   │   ├── EntityCard.tsx            Unifikovaná listing karta + EntityChip
│   │   │   ├── ListingHero.tsx           Hero pro listings + StatsBar + EmptyState
│   │   │   └── DetailHero.tsx            Hero pro detail pages + DetailLayout + SidebarCard
│   │   └── magazine/
│   │       └── MagazineHeader.tsx        ← AKTUALIZOVÁNO (inline search + mobile)
│   ├── app/
│   │   ├── layout.tsx                    ← REFERENCE — propojení s tvým layoutem
│   │   ├── magazine-v2-additions.css     ← APPEND do globals.css
│   │   ├── raperi/
│   │   │   ├── page.tsx                  ← Listing s ListingHero + StatsBar
│   │   │   └── [slug]/page.tsx           ← Detail s DetailHero + DetailLayout
│   │   ├── alba/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── labely/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── zanry/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── skladby/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   └── clanky/
│   │       ├── page.tsx                  ← Magazine-style listing (ne FilterableListing)
│   │       └── [slug]/page.tsx           ← Article reader s related grid
└── README.md
```

## Nasazení (10 minut)

### 1. Záloha stávajících souborů

```bash
# Z rootu rap-engine repa
for f in src/app/layout.tsx \
         src/app/raperi/page.tsx src/app/alba/page.tsx src/app/labely/page.tsx \
         src/app/zanry/page.tsx src/app/skladby/page.tsx src/app/clanky/page.tsx; do
  cp "$f" "$f.OLD-BACKUP"
done

# Stejně pro detail pages
for f in 'src/app/raperi/[slug]/page.tsx' 'src/app/alba/[slug]/page.tsx' \
         'src/app/labely/[slug]/page.tsx' 'src/app/zanry/[slug]/page.tsx' \
         'src/app/skladby/[slug]/page.tsx' 'src/app/clanky/[slug]/page.tsx'; do
  cp "$f" "$f.OLD-BACKUP"
done
```

### 2. Nainstaluj soubory

```bash
# Sdílené komponenty
mkdir -p src/components/shared
cp 4rap-magazine-v2/src/components/shared/*.tsx src/components/shared/

# Updated MagazineHeader
cp 4rap-magazine-v2/src/components/magazine/MagazineHeader.tsx src/components/magazine/

# Listing + detail pages
cp 4rap-magazine-v2/src/app/raperi/page.tsx        src/app/raperi/
cp 4rap-magazine-v2/src/app/alba/page.tsx          src/app/alba/
cp 4rap-magazine-v2/src/app/labely/page.tsx        src/app/labely/
cp 4rap-magazine-v2/src/app/zanry/page.tsx         src/app/zanry/
cp 4rap-magazine-v2/src/app/skladby/page.tsx       src/app/skladby/
cp 4rap-magazine-v2/src/app/clanky/page.tsx        src/app/clanky/

cp '4rap-magazine-v2/src/app/raperi/[slug]/page.tsx'   'src/app/raperi/[slug]/page.tsx'
cp '4rap-magazine-v2/src/app/alba/[slug]/page.tsx'     'src/app/alba/[slug]/page.tsx'
cp '4rap-magazine-v2/src/app/labely/[slug]/page.tsx'   'src/app/labely/[slug]/page.tsx'
cp '4rap-magazine-v2/src/app/zanry/[slug]/page.tsx'    'src/app/zanry/[slug]/page.tsx'
cp '4rap-magazine-v2/src/app/skladby/[slug]/page.tsx'  'src/app/skladby/[slug]/page.tsx'
cp '4rap-magazine-v2/src/app/clanky/[slug]/page.tsx'   'src/app/clanky/[slug]/page.tsx'

# CSS doplňky
cat 4rap-magazine-v2/src/app/magazine-v2-additions.css >> src/app/globals.css
```

### 3. Aktualizuj `src/app/layout.tsx`

Soubor v balíku je **referenční** — NEPŘEPISUJ tvůj 1:1, protože má GA, JsonLd a další věci specifické pro tvůj projekt. Místo toho do tvého layoutu zameň:

```diff
- import { Header } from '@/components/layout/Header'
+ import { MagazineHeader } from '@/components/magazine/MagazineHeader'
+ import { countRecent } from '@/lib/magazine'
+ import { allClaneks } from 'contentlayer/generated'

  export default function RootLayout({ children }) {
+   const unreadCount = countRecent(allClaneks, 7)
    return (
      <html lang="cs">
        <body>
-         <Header />
+         <MagazineHeader unreadCount={unreadCount} />
          {children}
        </body>
      </html>
    )
  }
```

A přidej `viewport` export (pro správné mobile chování):

```tsx
export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}
```

### 4. Sanity check + dev

```bash
npx tsc --noEmit               # mělo by projít clean
npm run dev
```

Otevři ve dvou oknech: **desktop (1280×)** a **mobile (375×)** — DevTools device toolbar je tvůj přítel.

## Mobile testing checklist

- [ ] **Hamburger menu** — klik na ikonu otevře drawer, klik mimo (overlay) zavře, Esc zavře
- [ ] **Mobile search** — klik na lupu zobrazí full-screen search overlay s autofocusem na input
- [ ] **⌘K / Ctrl+K shortcut** — focusne search v hlavičce (desktop) nebo otevře search overlay (mobile)
- [ ] **Body scroll lock** — když je drawer otevřený, pozadí se neposouvá
- [ ] **Touch targets** — všechna tlačítka v hlavičce ≥ 44×44px (Apple HIG)
- [ ] **Safe area** — na iPhone s notchem je drawer pod notchem (CSS `env(safe-area-inset-top)`)
- [ ] **Form inputs** — fontové velikosti `≥16px` na mobile (jinak Safari zoom-in při focus)
- [ ] **Listing pages** — single column na <640px, 2-col na sm-md, 3-col na lg
- [ ] **Detail pages** — sidebar stack pod main content na <lg
- [ ] **Breadcrumbs** — horizontálně scrollable s `scrollbar-none` na úzkém viewportu
- [ ] **Featured hero** — title se škáluje (4xl → 6xl), nelámá se hloupě

## Klíčová UX rozhodnutí

### Notification badge (žluté kolečko s číslem)

Defaultně ukazuje počet článků z posledních 7 dní. Konfigurace v `layout.tsx`:

```tsx
<MagazineHeader unreadCount={countRecent(allClaneks, 7)} />
//                                              ↑ změň dní
<MagazineHeader />  // vypnout úplně
```

### Search (⌘K)

- **Desktop**: inline input v headeru, ⌘K mu dá focus
- **Mobile**: lupa ikona otevře full-screen overlay s autofocusem
- **Enter**: submituje na `/hledej?q=...` — funguje s tvojí stávající search stránkou

### Mobile menu

- Slide-from-right drawer (rozumný target pro pravoruční palce)
- Nav má emoji ikony pro rychlou orientaci
- Sekce "Více" obsahuje sekundární odkazy (O projektu, Hledat)
- Active page má zelené pozadí + ring + tečku
- Body scroll lock přes `useEffect`

### Listing hero

- **Kicker** (mini label nad titlem) má barvu odpovídající kindu:
  - Rapeři: `#e4ff1a` (lime)
  - Alba: `#60a5fa` (sky)
  - Labely: `#a78bfa` (violet)
  - Žánry: `#34d399` (emerald)
  - Skladby: `#f472b6` (pink)
  - Články: `#fb923c` (orange)
- **StatsBar** dává okamžitý přehled o velikosti datasetu

### Detail layout

- **2-col grid** `[main 1fr] [sidebar 320px]`, stack na <lg
- **Sidebar je sticky** — drží se na obrazovce při scroll
- **DetailHero** vždycky: type pill → chips (genres/label/year) → title → subtitle (real name / artist) → description
- **InfoDl** = miniature `<dl>` pro klíčové fakty v sidebar cardech

## Co je v MVP zatím "mock"

| Feature | Co dělá | Co potřebuje |
|---|---|---|
| `NEPŘEČTENÉ` filtr v homepage feedu | Vizuální toggle | localStorage tracking přečtených slugů |
| `FILTR` dropdown v homepage | Vizuální stav | `useSearchParams()` + filtrace v `page.tsx` |
| Notification count | Posledních 7 dní | Reálná logika (např. od last visit timestamp v localStorage) |
| Trending sidebar | Heuristika (featured + recency) | Plausible/Umami view counts |

## Známé tradeoffs

### `featured` field

Listing pages odkazují na `entity.featured` pro vykreslení žluté hvězdičky.
- Rapper, Album, Clanek tohle pole mají v schématu.
- Label, Zanr, Skladba ho **nemají** — TypeScript je tolerantní, dostává `undefined`, hvězdička se nezobrazí. Pokud chceš featured i pro labely/žánry, přidej do `contentlayer.config.ts`:
  ```ts
  featured: { type: 'boolean', default: false },
  ```

### MDXRenderer

Detail pages importují `MDXRenderer` z `@/components/entity/MDXRenderer` (tvoje stávající komponenta). Když ji předěláš nebo přejmenuješ, fixni importy v detail pages.

### `FilterableListing`

Zachovala jsem ji ve všech listing pages **kromě `/clanky/`**. V `/clanky/` jsem ji nahradila grid s `ArticleCard`-y, aby vizuálně odpovídala homepage feedu. Pokud chceš filtraci i tam, refactoruj zpátky na FilterableListing s `itemType="clanek"`.

### Sub-listing pages (`/labely/[slug]/raperi`, `/zanry/[slug]/alba`, atd.)

Tyhle podsekce v balíku **nejsou**. Měly by používat stejný pattern (`ListingHero` + grid `EntityCard`). Pokud chceš, můžu je vyrobit zvlášť — řekni si.

## Vrácení staré verze

```bash
for f in src/app/layout.tsx src/app/{raperi,alba,labely,zanry,skladby,clanky}/page.tsx; do
  mv "$f.OLD-BACKUP" "$f"
done

for f in 'src/app/raperi/[slug]/page.tsx' 'src/app/alba/[slug]/page.tsx' \
         'src/app/labely/[slug]/page.tsx' 'src/app/zanry/[slug]/page.tsx' \
         'src/app/skladby/[slug]/page.tsx' 'src/app/clanky/[slug]/page.tsx'; do
  mv "$f.OLD-BACKUP" "$f"
done
```

A vrať starý `Header` import v `layout.tsx`. Nové komponenty (`/shared/`, `MagazineHeader.tsx`) můžou v repu zůstat — neruší.
