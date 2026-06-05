# RapEngine — Setup & Deploy Guide

## Lokální spuštění (5 sekund)

```bash
tar -xzf rap-engine.tar.gz
cd rap-engine
npm install --legacy-peer-deps
npm run dev
# → http://localhost:3000
```

## Deploy na Vercel (preview)

### Varianta A: přímý CLI deploy

```bash
cd rap-engine
npx vercel deploy
# → vybereš team Hotshots
# → nový projekt: rap-engine
# → preview URL: https://rap-engine-xxx.vercel.app
```

Pro production deploy:
```bash
npx vercel deploy --prod
```

### Varianta B: přes GitHub (doporučeno pro CI/CD)

```bash
# 1. Vytvoř GitHub repo
gh repo create RapEngine --private
# nebo přes web: https://github.com/new

# 2. Push existující branch (seo-engine-rebuild)
git remote add origin git@github.com:USERNAME/RapEngine.git
git push -u origin seo-engine-rebuild

# 3. V Vercel dashboardu:
#    - Import Project → GitHub → RapEngine
#    - Framework: Next.js (auto-detect)
#    - Production branch: main (až bude)
#    - Preview: každý PR/push
```

## Připojení domény (až po testu)

Domain `4rap.cz` aktuálně směřuje na projekt `czech-rap-media` (Vite).
Až bude RapEngine ready pro produkci:

1. V Vercel dashboardu → `czech-rap-media` → Domains → odpojit `4rap.cz`
2. V `rap-engine` → Domains → přidat `4rap.cz` + `www.4rap.cz`
3. DNS update není potřeba (Vercel dělá interní přepínání)

## Environment Variables (zatím žádné)

Budoucí ENV vars (Fáze 3+):
- `FLUX_API_KEY` — pro AI image generation (až bude potřeba)
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — Fáze 4, migrace z JSON

## Přidání nové entity

### Nový rapper
Vytvoř soubor `content/raperi/jmeno-rappera.mdx`:

```mdx
---
title: "Jméno"
slug: "jmeno-rappera"
realName: "Občanské jméno"
born: "1995"
active: "2015–současnost"
label: "Název labelu"
genre: ["drill", "trap"]
description: "Stručný popis (max 200 znaků)"
featured: true
publishedAt: "2024-12-01"
---

Hlavní obsah profilu v MDX...

## Sekce 1

Text...
```

Při `npm run build` se automaticky vygeneruje:
- `/raperi/jmeno-rappera` stránka
- záznam v `sitemap.xml`
- Schema.org `MusicGroup` markup
- canonical URL
- OG meta tagy

### Stejný princip platí pro alba/labely/zanry/clanky.

## Auto-interlinking (Fáze 3)

Při psaní MDX textů stačí použít jména rapperů/labelů přirozeně:

```mdx
Yzomandias spolu s Gleb založili Milion+.
```

Po dotažení Fáze 3 se to automaticky transformuje na:

```html
<a href="/raperi/yzomandias">Yzomandias</a> spolu s 
<a href="/raperi/gleb">Gleb</a> založili 
<a href="/labely/milion-plus">Milion+</a>.
```

Registry entit je v `src/lib/interlinking.ts` — přidávej nové slugy + aliasy.

## Build verifikace

```bash
npm run build
# Mělo by skončit "✓ Generating static pages"
# A vypsat všechny SSG routes
```

Live test SEO výstupu:
```bash
npm run start
curl http://localhost:3000/raperi/yzomandias | grep -E "canonical|og:title|application/ld"
curl http://localhost:3000/sitemap.xml
```
