# 4rap.cz — Mapa české rapové scény

> **Operační systém pro českou (a slovenskou) rapovou scénu.** Propojená znalostní databáze interpretů, alb, skladeb, labelů, lokalit, producentů, žánrů a témat — strukturovaná do prohledávatelného a vizualizovatelného grafu.

**Live:** [https://4rap.cz](https://4rap.cz) · **Branch:** `13-7-26-backup` · **Stack:** Next.js 16 + React 19 + Tailwind 4 + MDX

---

## Co to dělá

Webová znalostní báze o české a slovenské rapové scéně. **1701 aktivních entit** v 13 typech, propojených **~5600 hranami** (vazbami mezi entitami — členství v labelu, track na albu, feat v tracku, lokace původu, …). Veřejně přístupné na 4rap.cz.

| Typ entity | Počet | Příklad slugů |
|---|--:|---|
| `album` | 604 | `album_planeta-opice`, `album_opus-magnum` |
| `track` | 427 | `track_porsche-boy-blinky-blinky` |
| `artist` | 282 | `artist_porsche-boy`, `artist_paulie-garand`, `artist_yzomandias` |
| `genre` | 125 | `genre_czech-rap`, `genre_drill`, `genre_boom-bap` |
| `label` | 94 | `label_milion-plus`, `label_pmg-records` |
| `location` | 42 | `location_praha`, `location_bratislava`, `location_ostrava` |
| `theme` | 35 | `theme_regional`, `theme_humor` |
| `style` | 24 | `style_street`, `style_conscious` |
| `mood` | 22 | `mood_dark`, `mood_chill` |
| `article` | 17 | `article_dve-vlny-jedno-more-cesky-drill-a-boom-bap-revival` |
| `producer` | 16 | `producer_dj-wich`, `producer_haarp` |
| `collective` | 8 | `collective_milion-plus`, `collective_vibes-gang` |
| `scene` | 5 | `scene_mainstream`, `scene_independent` |
| **Celkem** | **1701** | |

*(Deprecated entity v `content/entities/deprecated-*/` nejsou zahrnuté. Build cache se jich zbavuje.)*

## Klíčové vlastnosti

- **Fulltextové vyhledávání** (`/hledat`) — MiniSearch index nad všemi entitami (~580 KB cache, sub-100ms odpovědi)
- **Věcné pohledy** — autoři, raperi, alba, skladby, producenti, labely, kolektivy, lokality, akce, scény, žánry, styly, témata, nálady, články (17 statických stránek + 15 dynamických `[slug]` routes)
- **Mapa grafu** (`/mapa`) — interaktivní vizualizace pomocí `d3-force` + `react-leaflet`. Layout je předpočítaný v `graph-layout.json` pro rychlý initial paint.
- **Taxonomie a klasifikace** — žánry (125), styly (24), nálady (22), témata (35) — každá entita může být přiřazena do více kategorií
- **SEO** — generovaný `sitemap.xml` s `seoScore ≥ 70` filtrem, `robots.txt`, OG image (`/og-image.png`), strukturovaná metadata v každém `page.tsx`, Apple touch icon
- **REST API** (`/api/v1/*`) — read/write přístup k entitám s bearer-auth (`withAuth` middleware). Proxy na `44rap.base44.app` a `rap-monitor-copy` pro externí synchronizaci.
- **Interní prolinkování** — automatické `inbound.json` mapy (kdo odkazuje na koho) pro related-entity doporučení

## Tech stack

| Vrstva | Technologie |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 6 |
| Bundler | Turbopack (root: `process.cwd()`, aby nesledoval `/Users/` celé) |
| Build output | `standalone` (statická generace pro Vercel) |
| CSS | Tailwind CSS 4 + `@tailwindcss/typography` |
| MDX rendering | Vestavěný `@next/mdx` s vlastními komponenty v `src/components/mdx.tsx` |
| Hledání | MiniSearch (fulltext) |
| Graf layout | `d3-force` (vypočteno offline) + `react-leaflet` (mapa) |
| Schema validace | Zod 4 |
| Analytics | GA4 + custom event tracker (`PageViewTracker`, `EngagementTracker`) |
| API auth | Custom `withAuth` wrapper s bearer tokenem |

## Architektura

```
src/
├── app/                      Next.js App Router (17 routes + 15 [slug])
│   ├── page.tsx              Homepage — featured entities, scene cards
│   ├── mapa/                 Interaktivní mapa grafu
│   ├── hledat/               Fulltextové vyhledávání
│   ├── raperi/[slug]/        Detail rappera
│   ├── alba/[slug]/          Detail alba
│   ├── skladby/[slug]/       Detail tracku
│   ├── labely/[slug]/        Label stránka
│   ├── lokality/[slug]/      Město / scéna
│   ├── producenti/[slug]/    Producent
│   ├── kolektivy/[slug]/     Kolektiv / crew
│   ├── zanry/[slug]/         Žánr (drill, trap, …)
│   ├── styly/[slug]/         Styl (street, conscious, …)
│   ├── temata/[slug]/        Téma (regional, humor, …)
│   ├── nalady/[slug]/        Nálada (dark, chill, …)
│   ├── clanky/[slug]/        Článek / feature
│   ├── sceny/[slug]/         Scéna (mainstream, indie, …)
│   ├── akce/[slug]/          Akce / event
│   ├── autori/petr-piskacek/ Static author profile
│   ├── sitemap.ts            Auto-generated sitemap (seoScore ≥ 70)
│   ├── robots.ts             robots.txt
│   └── api/
│       ├── v1/               Public REST API (bearer auth)
│       └── search-index/     Fulltext search JSON dump
│
├── components/               React komponenty
│   ├── layout/               Header, Footer, navigation
│   ├── content/              MDX komponenty
│   ├── entity/               Detail page UI (rapper, album, …)
│   ├── graph/                Force-directed graph vizualizace
│   ├── listing/              Seznam pages (rapperi/, alba/, …)
│   ├── search/               Hledání UI
│   ├── seo/                  Metadata helpers
│   ├── analytics/            GA4, tracking
│   ├── homepage/             Homepage cards
│   ├── media/                Image, video embed
│   └── ui/                   Generic UI primitives
│
└── lib/
    ├── search.ts             MiniSearch wrapper
    ├── analytics.ts          Pageview tracking
    ├── seo/                  Sitemap builder, OG image, structured data
    ├── api/                  Auth middleware, proxy helpers
    ├── indexation/           SEO scoring + indexation state machine
    └── content/              ⚡ Content pipeline
        ├── cache-reader.ts       Lazy load 5 .json cache files
        ├── cache-builder.ts      Build entities.json, graph.json, …
        ├── cache-indexation.ts   Build indexation-state.json
        ├── entity-resolver.ts    Unify graph-folder + legacy flat
        ├── graph-normalize.ts    Build edges from relations.json
        ├── graph-query.ts        BFS/shortest-path traversals
        ├── legacy-loader.ts      Load `content/<type>/<slug>/` (v1 formát)
        ├── loader.ts             Graph-folder loader (v2 formát)
        ├── relation-registry.ts  Edge types + semantics
        ├── schemas.ts            Zod schemas pro MDX frontmatter + meta
        ├── validator.ts          Cross-entity validation (FK integrity, duplicates)
        ├── route-resolver.ts     Entity → URL slug
        ├── label-resolver.ts     Label name → canonical id
        ├── deezer-helpers.ts     Deezer API integration pro audio metadata
        ├── images.ts             Image resolver (relative → public URL)
        ├── mdx.tsx               MDX komponenty mapy
        ├── page-helpers.tsx      Server-side helpers pro page.tsx
        ├── paths.ts              Centralizované cesty k cache + content
        ├── constants.ts          Konfig (BASE_URL, defaults, …)
        ├── types.ts              TypeScript typy entit, hran, MDX
        ├── migration-mappers.ts  v1 ↔ v2 konverze
        └── age-utils.ts          Datum / věk entity utils

scripts/                      ~90 build/import/migration scriptů
content/
└── entities/                 1701 MDX entit (graph-folder formát)
    ├── artist_porsche-boy/
    │   ├── entity.mdx        Content (frontmatter + body)
    │   ├── meta.json         Strukturovaná metadata (audio, sources, …)
    │   └── relations.json    Outgoing edges (label memberships, tracks, …)
    ├── album_planeta-opice/
    ├── track_porsche-boy-blinky-blinky/
    ├── deprecated-artists/   Vyřazené entity (build cache je přeskakuje)
    └── …

.content-cache/               ⚡ Build-time generated (gitignored)
├── entities.json             Všech 1701 entit normalizovaných
├── graph.json                ~5600 hran (edges)
├── graph-layout.json         d3-force pozice uzlů (precomputed)
├── inbound.json              Backlinky (kdo→koho)
├── indexation-state.json     SEO skóre + indexation flags
├── routes.json               URL mapy pro sitemap
└── search-index.json         MiniSearch dump
```

## Build pipeline

**Workflow: 1 rapper = 1 commit.** Každá nová entita = vlastní MDX soubor + `meta.json` + `relations.json`, build cache se obnoví jedním příkazem, commit message `feat: <artist> — <summary>`.

```bash
# 1) Instalace
npm install                  # pouze deps; .next a node_modules gitignored

# 2) Vývoj
npm run dev                  # next dev -p 3114

# 3) Build cache (5 .json souborů do .content-cache/)
npm run cache:build          # = build-content-cache.ts + build-graph-layout.ts
npm run cache:graph-layout   # rebuild d3-force layout (po velkých změnách grafu)
npm run cache:track-import   # import nových tracků z rap-monitor
npm run cache:validate       # FK integrity + duplicate detection

# 4) Produkční build
npm run build                # cache:build → next build
npm run start                # next start

# Env var: SKIP_VALIDATION=1 přeskočí validaci (jen pro staré styly→žánry)
SKIP_VALIDATION=1 npm run cache:build
```

**Exit codes build-content-cache.ts:**
- `0` — success (i s minor load warnings)
- `1` — entity load errors (printed to stderr)
- `2` — fatal error

**Build pipeline flow:**

```
content/entities/*/entity.mdx
       │
       ▼
entity-resolver.ts  (graph-folder + legacy unified)
       │
       ▼
schemas.ts (Zod validation)  ──── fail → exit 1
       │
       ▼
graph-normalize.ts  ──►  graph.json, inbound.json
       │
       ▼
cache-builder.ts    ──►  entities.json, routes.json
       │
       ▼
cache-indexation.ts ──►  indexation-state.json (SEO scores)
       │
       ▼
build-graph-layout.ts (d3-force)  ──►  graph-layout.json
       │
       ▼
build-search-index   (MiniSearch)  ──►  search-index.json
```

## Content schéma (entity)

Každá entita v `content/entities/<type>_<slug>/` má 3 soubory:

**`entity.mdx`** — frontmatter + Markdown tělo:

```markdown
---
title: "porsche-boy"
slug: "porsche-boy"
type: "artist"
description: "Umělec"
publishedAt: "2026-06-12"
---

Člen Milion+ crew. Rapper spojený s brněnskou scénou a labelem Milion+.

**Styly:** House-rap, Trap, New Wave, Electronic Rap, Garage Rap

## Klíčová alba

| Album | Rok | Popis |
|-------|-----|-------|
| ...
```

**`meta.json`** — strukturovaná metadata (audio URL, obrázky, …):

```json
{
  "id": "track_ektor-nedava-to-smysl",
  "type": "track",
  "title": "Nedává to smysl",
  "description": "Ektor se ve skladbě ostře vymezuje proti internetovým kritikům…",
  "publishedAt": "2016-02-14",
  "extraMeta": {
    "duration": 198,
    "explicit": true,
    "sources": [
      "https://open.spotify.com/track/5uYqFkG3V66TID3uD3L6rM",
      "https://www.youtube.com/watch?v=F_Yq-X9w-oM",
      "https://www.deezer.com/track/1270954752"
    ]
  },
  "youtube": { "id": "F_Yq-X9w-oM", "title": "Nedává to smysl", "channel": "..." }
}
```

**`relations.json`** — outgoing edges (label membership, tracks na albu, featy, …):

```json
[
  { "type": "member_of_label", "target": "label_milion-plus" },
  { "type": "from_location", "target": "location_brno" },
  { "type": "has_genre", "target": "genre_house-rap" }
]
```

## REST API

Bez auth funguje jen `/api/v1` (status) a `/api/search-index`. Ostatní cesty vyžadují bearer token.

```
GET    /api/v1                         API status + endpointy
GET    /api/v1/artists?q=&limit=…      List rapperů (filtrovatelné, stránkovatelné)
GET    /api/v1/artists/[slug]          Detail rappera
POST   /api/v1/artists                 Create
PUT    /api/v1/artists/[slug]          Update
DELETE /api/v1/artists/[slug]          Smazat
GET    /api/v1/tracks?artist=&type=…   List skladeb
POST   /api/v1/tracks                  Create
GET    /api/v1/44rap/entities/...      Proxy na 44rap.base44.app (Rapper, FreshRelease, RapEvent)
GET    /api/v1/rap-monitor/entities/…  Proxy na rap-monitor-copy (Artist, Song, User)
GET    /api/search-index               Fulltext MiniSearch dump (client-side)
```

**Auth:** `Authorization: Bearer <token>` (env `API_BEARER_TOKEN`). Všechny mutační cesty (`POST`/`PUT`/`DELETE`) vyžadují auth. `withAuth` middleware v `src/lib/api/auth.ts`.

## Dev tipy

- **Statická generace je standalone output** — build vytvoří `.next/standalone/` pro self-hosted deploy. Aktuálně hostovaný na Vercel (`4rap.cz`).
- **Build cache timestamp varování** — pokud `ls -la .content-cache/` ukazuje starší datum než poslední MDX edit, je třeba `npm run cache:build`. Working tree by nikdy neměl zůstat dlouho dirty, protože cache se stane nekonzistentní s diskem.
- **Přidání nového rapperea** — zkopíruj template z jiného `content/entities/artist_*/`, vyplň `entity.mdx` + `meta.json` + `relations.json`, pak `npm run cache:build && git add . && git commit -m "feat: <artist> — <summary>"`.
- **Hledání problémů s FK** — `npm run cache:validate` vypíše dangling relations a duplikáty. Před commitem vždycky spustit.
- **Dávkové importy** — v `scripts/` je ~90 skriptů pro různé zdroje (44rap, base44, rap-monitor, rap-zzz, ego, separ, …). Každý má vlastní komentář na začátku; cluster je `import-*` pro nové feedy, `add-*` / `fix-*` pro opravy, `batch-*` pro hromadné operace.


## ⚠️ Kvalita dat — zdroje a AI

**Rap Monitor (`rap-monitor.base44.app`) je INTERNÍ AI sběrná apka.** Jeho data
(`phase3Pas`, `themes`, `moods`, texty, AI eseje) jsou **AI-generated a vyžadují
ověření** — **nejsou autorita**.

**Obsah v MDX = FAKTA, ne AI.** Povolené sekce u skladeb: O skladbě, Fakta,
Kontext, Poslechnout a zdroje. Sekce jako „O čem je", „Produkce",
„Interpretace", „Dopad" (AI eseje) byly 14. 10. 2026 odstraněny — **nevracet**.

**Index gate stojí na faktech, ne na AI klasifikaci:**

```
index   ⟸ artist + délka + (žánr NEBO label NEBO feat NEBO producent) + MDX ≥400
noindex ⟸ jinak
```

`phase3Pas` zůstává v `extraMeta` jen jako historická stopa, **nerozhoduje**.
`scripts/phase3/` je **DEPRECATED** (viz `scripts/phase3/README-DEPRECATED.md`).

**Pravidlo:** zdroj dat klasifikovat (ověřený vs AI) PŘED použitím.
Vlastní AI apka ≠ autorita. Detail: `PLAN-AI-SLOP-TRACKS.md`.

## Repo konvence

- **Branch:** `13-7-26-backup` (snapshot z 13. 7. 2026 — viz commit `d538fab4`)
- **Commity:** `feat: <artist> — <summary>` pro nové entity, `fix: <scope> — <summary>` pro opravy, `chore: <scope>` pro build/script tooling
- **Working tree:** nikdy nenechávat dlouho dirty — build cache se stane nekonzistentní s diskem
- **`.gitignore`:** `node_modules/`, `.next/`, `.content-cache/`, `*.log`, `.env.local`, `.backups/`
- **MDX frontmatter:** povinné `title`, `slug`, `type`, `description`, `publishedAt` (ISO datum)
- **Slug konvence:** ASCII lowercase + pomlčky, prefix `type_` v adresáři (např. `artist_porsche-boy/`)
- **Scope rule:** pouze CZ/SK rap. Zahraniční feat-only (např. DJ Premier host) = DELETE.

## Stav projektu (srpen 2026)

- ✅ 1701 aktivních entit, ~5600 hran v grafu
- ✅ 17 static routes + 15 `[slug]` dynamic routes
- ✅ Sitemap (indexation-state filtrovaný, `seoScore ≥ 70`), robots, OG image
- ✅ REST API s bearer auth + proxy na 44rap a rap-monitor
- ✅ Live na https://4rap.cz (Vercel)
- ✅ Build cache aktuální (13. 8. 2026) — novější než poslední MDX edit (19. 7. 2026). Před deploy vždy ověřit `ls -la .content-cache/` vs poslední MDX změna.
- 🔧 V plánu: redesign /mapa (interaktivnější), rozšíření API o `scenes` a `themes` filtry, sync s rap-monitor hourly cron (viz `scripts/hourly-sync.ts`)
