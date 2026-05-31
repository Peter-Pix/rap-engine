# 4RAP — Magazine v2.3 POLISH

Soubor konkrétních fixů reagujících na zpětnou vazbu ze screenshotů.

## 7 fixů, jeden hotfix

### 1. Notification badge (žluté kolečko s číslem)

**Před:** Plné `#e4ff1a` žluté kolečko, 28 px na desktopu / 28 px na mobilu — křiklavé.
**Po:** **Emerald** (sladěné s logem), menší (28 px desktop / 24 px mobile), subtle fill `bg-emerald-500/15` + ring.

Vzhled je teď viditelný indikátor, ne CTA — přesně podle tvé poznámky.

### 2. Mobile FeedFilters layout

**Před:** `FEED · 27 ČLÁNKŮ · ●NEPŘEČTENÉ · ≡ FILTR` se nevejde do 390 px → horizontální scroll.
**Po:**
- `FEED` slovo schované na mobile (`hidden sm:inline`)
- Pillula menší (`px-2.5 py-1.5` místo `px-3 py-1.5`)
- Gap zhustlý (`gap-1` na mobilu vs `gap-2` na desktopu)

Layout na mobile: `[27 článků]   [● nepřečtené]  [≡ filtr]` — vejde se i na 360 px viewport.

### 3. Diakritika v desktop nadpisech

**Před:** `lg:text-6xl lg:leading-[0.92]` — háčky nad Š/Č/Ř lezou do předchozího řádku ("BEN CRIȘTOVAO" měl ouškle obříznutý háček).
**Po:**
- Max desktop title: `text-5xl` (48 px) místo `text-6xl` (60 px) — o stupeň menší napříč
- Line-height vždy ≥1.05 (i na `lg` breakpointu)
- Nová CSS třída `.cz-display` přidává `padding-top: 0.08em` a `font-feature-settings: "ss01"` — extra clearance pro česká diakritická znaménka

**Featured hero** je zachovaný o stupeň větší (max `text-6xl` 60 px) — je hero, má prim. Ale stejně diakritika-safe.

### 4. Mobilní menu — emoji pryč

**Před:** 📰 Magazín · 🎤 Rappeři · 💿 Alba · 🏷️ Labely · 🎵 Žánry · 🎧 Skladby · ✍️ Články
**Po:** Čistý seznam textových nadpisů. Aktivní item má jen zelený dot vpravo.

Příští refresh můžu přidat čisté outline SVG ikony (Lucide-style) místo emoji, pokud chceš subtle vizuál. Ale defaultně teď pouze typografie.

### 5. Duplicitní search pryč

**Před:** Search input v mobile menu drawer + lupa ikona v hlavičce.
**Po:** **Jen lupa v hlavičce.** Drawer obsahuje výhradně navigaci. Žádná duplicita.

### 6. NEW badge — rounded + menší

**Před:** Žlutý square pill `bg-[#e4ff1a]` s `rounded` rohy, 10 px font — nekonzistentní s ostatními kategorie pills (které mají `rounded-full`).
**Po:** `rounded-full` (jako ANALÝZA, EDITORIAL atd.), 9 px font, slight 90 % opacity. Viditelný indikátor, ne CTA.

### 7. Konzistentní hero typografie

Přepsaný napříč `FeaturedHero`, `ListingHero`, `DetailHero`, `ArticleCard`:

| Breakpoint | DetailHero/ListingHero | FeaturedHero | ArticleCard h2 |
|---|---|---|---|
| Mobile (<640) | 26 px | 26 px | 16 px |
| Tablet (≥640) | 30 px (text-3xl) | 36 px (text-4xl) | 20 px |
| md (≥768) | 36 px (text-4xl) | 48 px (text-5xl) | 24 px |
| lg (≥1024) | 48 px (text-5xl) | 60 px (text-6xl) | 24 px |

Všechny mají `.cz-display` třídu → diakritika-safe.

## Co je v balíku

```
4rap-magazine-v2.3/
├── src/
│   ├── components/
│   │   ├── magazine/
│   │   │   ├── MagazineHeader.tsx    ← emerald badge
│   │   │   ├── FeaturedHero.tsx      ← typografie napříč
│   │   │   ├── ArticleCard.tsx       ← typografie + NewBadge rounded
│   │   │   ├── CategoryBadge.tsx     ← NewBadge rounded-full
│   │   │   └── FeedFilters.tsx       ← mobile layout fix
│   │   └── shared/
│   │       ├── MobileMenu.tsx        ← bez emoji, bez search
│   │       ├── DetailHero.tsx        ← typografie
│   │       └── ListingHero.tsx       ← typografie
│   └── app/
│       └── magazine-v2.3-polish.css  ← APPEND do globals.css
└── README.md
```

## Nasazení (1 minuta)

```bash
# Z rootu rap-engine repa
cp 4rap-magazine-v2.3/src/components/magazine/*.tsx src/components/magazine/
cp 4rap-magazine-v2.3/src/components/shared/*.tsx src/components/shared/
cat 4rap-magazine-v2.3/src/app/magazine-v2.3-polish.css >> src/app/globals.css

npm run dev
```

## Co tě po deploy bude zajímat

### Smoke testy

**Desktop (≥1280 px):**
- [ ] Nadpis "BEN CRIȘTOVAO: MUŽ, KTERÝ PŘELOŽIL SVĚT DO ČEŠTINY" — háček nad Š se neobřezává
- [ ] "RAPPEŘI" h1 v listingu — háček nad Ř má vzduch
- [ ] Notification badge — zelený, menší, sladěný s logem
- [ ] Mezery a celkový rytmus nezměněn

**Mobile (≤640 px):**
- [ ] Header: žluté kolečko je teď zelené a menší
- [ ] FEED row se vejde do jedné řádky bez horizontálního scrollu
- [ ] Hamburger menu — žádné emoji, čistá typografie
- [ ] Drawer obsahuje JEN nav (žádný search)
- [ ] Klik na lupu v hlavičce → mobile search overlay (jediný způsob, jak hledat)
- [ ] NEW pillula u článků — rounded-full (kulatá), menší

### Pokud něco pořád skřípe

| Problém | Diagnostika |
|---|---|
| Notification badge je pořád žlutý | Vyčisti `.next/` build cache a restartuj dev |
| Háčky pořád přesahují na desktopu | Tailwind nepřebral `.cz-display` třídu — ověř, že CSS hotfix opravdu šel do `globals.css` přes `cat ... >> ...` |
| FEED row furt overflow | Zkontroluj že `<FeedFilters>` v `app/page.tsx` je new verze (ne stará z předchozí várky) |
| Emoji jsou pořád v menu | `src/components/shared/MobileMenu.tsx` se nepřepsal — copy znovu |

## Co je z tvého feedbacku TODO později

- **Nepřečtené filtr — reálná funkce.** Toggle dnes funguje vizuálně, ale nefiltruje feed. Potřebuje localStorage tracking přečtených slugů + filter v `page.tsx`. Můžu udělat v samostatném commitu.
- **Filtr dropdown — reálné kategorie.** Klik na položku v dropdown filtruje feed přes URL params. Stejně samostatný commit.
- **Subtle outline ikony v mobile menu** (pokud bys chtěl něco jemnějšího než čistá typografie) — Lucide React je v projektu, můžu napojit.

Pošli další screenshot po deploy — zejména rád bych viděl zda diakritika na desktop nadpisech opravdu sedí, to je delicate balance mezi tightness a safety.
