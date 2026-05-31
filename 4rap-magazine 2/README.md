# 4RAP — Magazine Layout

Nasazení nového magazín designu (homepage). Soubory jdou drop-in do tvého
`rap-engine` repa — používají existující `Clanek` typ z Contentlayeru,
existující CSS proměnné (`#e4ff1a` accent), existující `@/lib/*` aliasy.

## Co je v balíku

```
4rap-magazine/
├── src/
│   ├── components/magazine/
│   │   ├── MagazineHeader.tsx     # Sticky nav: logo + 5 sekcí + notif + search
│   │   ├── FeaturedHero.tsx       # Velká featured kartka nahoře
│   │   ├── ArticleCard.tsx        # Karty v feed gridu (2-col)
│   │   ├── TrendingSidebar.tsx    # Pravý sticky sidebar 01-05
│   │   ├── FeedFilters.tsx        # "FEED N článků | nepřečtené | filtr"
│   │   ├── CategoryBadge.tsx      # Color-coded kategorie + NEW badge
│   │   └── TagPill.tsx            # #hashtag pillula + TagList
│   ├── lib/
│   │   └── magazine.ts            # Data helpers (featured/feed/trending/dates)
│   └── app/
│       ├── page.tsx               # NOVÁ homepage = magazín layout
│       ├── layout.tsx             # Reference jak nahrať Header (NEPŘEPISOVAT 1:1!)
│       ├── magazine-additions.css # CSS doplňky (do globals.css)
│       └── o-projektu/page.tsx    # Stará "Budujeme databázi" hero (přesunutá)
└── README.md
```

## Nasazení (5 minut)

### 1. Záloha staré homepage

```bash
cp src/app/page.tsx src/app/page.tsx.OLD-BACKUP
```

### 2. Drop nové soubory

```bash
# z rootu rap-engine repa, po rozbalení 4rap-magazine.zip
cp -r 4rap-magazine/src/components/magazine src/components/
cp 4rap-magazine/src/lib/magazine.ts src/lib/
cp 4rap-magazine/src/app/page.tsx src/app/page.tsx
mkdir -p src/app/o-projektu
cp 4rap-magazine/src/app/o-projektu/page.tsx src/app/o-projektu/page.tsx
```

### 3. Připoj CSS doplňky

Append obsah `magazine-additions.css` na konec tvého `src/app/globals.css`:

```bash
cat 4rap-magazine/src/app/magazine-additions.css >> src/app/globals.css
```

Tohle přidá: `scrollbar-none`, `line-clamp-2/3`, jemné fade-in animace.

### 4. Napoj nový Header do `src/app/layout.tsx`

`layout.tsx` v balíku je **referenční** — NEPŘEPISUJ ho 1:1, protože tvůj
už nejspíš obsahuje fonty, providers, scripts, footer. Místo toho přidej
do svého layoutu:

```tsx
import { MagazineHeader } from '@/components/magazine/MagazineHeader'
import { allClaneks } from 'contentlayer/generated'
import { countRecent } from '@/lib/magazine'

// uvnitř komponenty:
const unreadCount = countRecent(allClaneks, 7)

// místo původního <Header /> dej:
<MagazineHeader unreadCount={unreadCount} />
```

Pokud máš v `src/components/layout/Header.tsx` starý header, nech ho v repu
jako legacy a v `layout.tsx` jen přepni import na `MagazineHeader`.

### 5. Spusť dev server

```bash
npm run dev
```

Otevři http://localhost:3000 — homepage je magazín. Stará hero je na `/o-projektu`.

## Design rozhodnutí

### Kategorie a barvy

`CategoryBadge` mapuje strings z `Clanek.category` na barevné pillula.
Match-logika je v `lib/magazine.ts` (resp. `CategoryBadge.tsx → categoryKey`):

| Vstup (case/diakritika-insensitive) | Barva |
|---|---|
| obsahuje `rape` | emerald |
| obsahuje `alb` | sky |
| obsahuje `label` | violet |
| obsahuje `zánr`/`zan` | emerald |
| obsahuje `navod`/`guide`/`jak` | pink |
| obsahuje `recen` | orange |
| obsahuje `rozhov`/`interview` | cyan |
| obsahuje `histor` | amber |
| obsahuje `analy` | violet |
| obsahuje `clánk`/`članek` | violet |
| fallback | zinc (neutrální) |

Pokud chceš jinou barvu pro konkrétní kategorii, uprav `STYLES` v
`CategoryBadge.tsx` (Tailwind utility, plain text).

### "NEW" badge

Žlutá pilulka. Triggers automaticky pokud `publishedAt < 14 dní`. Změnit
limit v `lib/magazine.ts → isRecent()`.

### Notification badge v hlavičce (žluté kolečko s číslem)

Defaultně ukazuje počet novinek za posledních 7 dní. Změň v `layout.tsx`:

```tsx
<MagazineHeader unreadCount={countRecent(allClaneks, 7)} />  // ← 7 dní
```

Nebo úplně schovej:

```tsx
<MagazineHeader />  // bez prop = bez badge
```

### Trending sidebar

Defaultně mix: featured (+50), <14 dní (+20), <30 dní (+10), newer = higher.
Až napojíš analytics view counts (Plausible/Umami), refactor v
`lib/magazine.ts → getTrendingArticles()`.

## Co je v MVP zatím "mock"

| Feature | Stav | Jak zapnout |
|---|---|---|
| `NEPŘEČTENÉ` toggle | Vizuálně funkční, nic nefiltruje | Napoj na localStorage (čtení = log slug) v `FeedFilters.tsx`, propaguj `unreadOnly` state přes page state nebo URL param |
| `FILTR` dropdown | Funkční stav, nic nefiltruje | V `page.tsx` přidej `useSearchParams()` → filtruj feed array |
| Notification count | Spočítané z `<7 dní` | Změň v `layout.tsx` na business logic kterou chceš |
| Trending | Heuristický (featured + recency) | Po napojení analytics nahraď za skutečné view counts |

## Responsive chování

- **Desktop ≥768px**: 2-col grid feed + trending sidebar
- **Tablet 640–768px**: 2-col grid feed, sidebar **schovaný**
- **Mobile <640px**: 1-col, sidebar schovaný, nav v hlavičce horizontálně scrollable

Trending sidebar je úmyslně `hidden md:block` — na mobilu by jen zabíral place.
Pokud ho chceš zobrazit i na mobilu (pod feedem), uprav `TrendingSidebar.tsx`:

```tsx
<aside className="hidden md:block">  →  <aside className="md:block">
```

A v `page.tsx` přesuň `<TrendingSidebar>` mimo grid nebo do druhého řádku.

## SEO

`page.tsx` má `metadata` export pro homepage. Open Graph je tam taky.
Pokud máš v repu globální `metadata` v `layout.tsx`, ten poskytuje fallback
pro ostatní stránky (`/raperi`, `/alba`...).

## Vrácení staré homepage

```bash
mv src/app/page.tsx.OLD-BACKUP src/app/page.tsx
```

A pak smaž `src/app/o-projektu/` pokud chceš.

## Co dál

1. **Dotvořit článkové stránky** — `src/app/clanky/[slug]/page.tsx` má teď stejný look + feel; můžeš ho redesignovat na stejnou estetiku (kategorie badge, big uppercase title, related sidebar)
2. **Article listing** — `src/app/clanky/page.tsx` může používat `ArticleCard` přes celý seznam
3. **Search page** — `src/app/hledej/page.tsx` může používat stejné karty pro výsledky
4. **Entity detail pages** (rapper/album/label) — mohou používat `CategoryBadge` + `TagList` pro vizuální konzistenci s magazínem
