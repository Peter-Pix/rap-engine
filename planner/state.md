# Stav projektu: rap-knowledge-graph (4rap.cz)

> **Audit:** The Archivist (Sovereign OS) · 2026-08-30 14:20 GMT+2
> **Branch:** `13-7-26-backup` (ahead 2 oproti origin)
> **Live:** https://4rap.cz (Vercel) · **Stack:** Next.js 16 + React 19 + Tailwind 4 + MDX
> **Metoda:** README, ROADMAP, git log, package.json, `npm run cache:validate`, struktura src/, grep TODO/FIXME.

---

## Co je hotové ✅

- **1701 aktivních entit** (13 typů) v `content/entities/` — album 604, track 427, artist 282, genre 125, label 94, location 42, theme 35, style 24, mood 22, article 17, producer 16, collective 8, scene 5.
- **~5600 hran** v grafu (graph.json), propojení entit (label membership, track na albu, feat, lokace, …).
- **Build cache aktuální** — `.content-cache/` z **13. 8. 2026 22:05**, poslední MDX edit **19. 7. 2026** (`fd7d40aa`). Cache je **NOVĚJŠÍ než poslední MDX změna** → cache je konzistentní s diskem. *(README/ROADMAP tvrdí "cache zastaralá 11. 7." — to je NEPŘESNÉ, viz níže.)*
- **17 static routes + 15 `[slug]` dynamic routes** v `src/app/` (raperi, alba, skladby, labely, lokality, producenti, kolektivy, zanry, styly, temata, nalady, clanky, sceny, akce, autori, mapa, hledat).
- **Fulltextové vyhledávání** (`/hledat`) — MiniSearch index (`search-index.json`, ~580 KB).
- **Mapa grafu** (`/mapa`) — d3-force + react-leaflet, layout předpočítaný v `graph-layout.json`.
- **REST API** (`/api/v1/*`) — read/write s bearer auth (`withAuth`), proxy na `44rap.base44.app` a `rap-monitor-copy`.
- **SEO** — sitemap.ts (seoScore ≥ 70 filtr), robots.ts, OG image, structured data, author page (`autori/petr-piskacek`).
- **98 skriptů** v `scripts/` (import, fix, batch, migration).
- **README.md výborné** (15 KB) — architektura, build pipeline, content schéma, API reference, repo konvence. Není to projekt s chybějící dokumentací.

## Co chybí / je rozbité ⚠️

- **2 rozbité stub entity** — `artist_filip-konvalinka` a `artist_if`:
  - `entity.mdx` je **prázdný (0 bytů)**.
  - `meta.json` **chybí `id` a `slug`** → `npm run cache:validate` hlásí **INVALID_META (4 chyby)**.
  - Přesto jsou **odkazované z 5 alb** (`album_2-mouchy-1-ranou`, `album_if`, `album_rap`, `album_rep`, `album_stop-play`) → **DANGLING_RELATION (5)**.
  - Jsou v cache (`entities.json`), ale nevalidní — build cache prošel i s nimi (pravděpodobně přes legacy loader / SKIP_VALIDATION).
- **`npm run cache:validate` FAILUJE** — 6 errors (4 INVALID_META + 2 další), 39 warnings. Build gate není zelený.
- **Žádný test script** — `package.json` nemá `"test"` ani `"lint"`. Není žádná automatizovaná regresní kontrola.
- **9 stub entit** celkem (`status: "stub"`), z toho 2 s prázdným MDX.

## Technický dluh 🧹

- **Zastaralá dokumentace o cache** — README.md (sekce "Stav projektu") a ROADMAP.md (Fáze 1 + Blokery) tvrdí *"build cache zastaralý (11. 7. vs poslední commit)"*. **Fakt: cache je 13. 8., novější než poslední MDX edit (19. 7.).** Dokumentace je nepřesná a zavádějící pro plánování.
- **39 non-blocking warnings** v validaci:
  - 33× `EMPTY_DESCRIPTION` — entity bez SEO popisu (žádný description v meta).
  - 1× `UNKNOWN_RELATION_KEY` — `article_nenadavam-protoze-me-to-bavi/relations.json` má klíč `"relations"` mimo relation registry (data se tiše ignorují).
  - 5× `DANGLING_RELATION` — viz rozbité entity výše.
- **`raw-data/` importy neověřené** — ROADMAP Fáze 1 zmiňuje import z `15profilu/`, `9rappers/`, `10/`, `genre/`, ale aktuální stav importu není v dokumentaci potvrzený.
- **`amp` soubor** (308 B) v rootu — neznámý účel, možná artefakt.

## Pozorování / rizika 🔍

- **Riziko: nevalidní entity v produkci.** `artist_filip-konvalinka` a `artist_if` jsou v cache a odkazované z alb, ale nemají validní meta (chybí id/slug) a prázdný MDX. Detail stránky rappera by mohl renderovat prázdný/neúplný obsah nebo selhat. **Před dalším deploym nutné opravit nebo odstranit.**
- **Riziko: žádné testy.** Bez `npm test`/lint gate není regresní ochrana. Build cache pipeline (98 skriptů) je komplexní a bez testů křehká.
- **Riziko: build cache prošel i s chybami.** To znamená, že `cache:build` buď neběží validaci striktně, nebo se spouští s `SKIP_VALIDATION=1`. Validace je oddělená (`cache:validate`) a není součástí build gate.
- **Pozorování: README je kvalitní** — dokumentace projektu je nadprůměrná. Slabina není README, ale **zastaralá tvrzení o cache** a **chybějící state.md** (tento soubor to řeší).
- **Pozorování: working tree čistý** (ahead 2, žádné uncommitted změny) — konzistentní s pravidlem "nikdy nenechávat dirty".

---

## Doporučené další kroky (pro Strategistu — vstup, ne plán)

1. **Opravit/odstranit 2 rozbité stub entity** (`artist_filip-konvalinka`, `artist_if`) — doplnit `id`/`slug` do meta.json + obsah MDX, NEBO odstranit a vyčistit dangling relations z 5 alb.
2. **Opravit `article_nenadavam-protoze-me-to-bavi`** — klíč `"relations"` mimo registry.
3. **Doplnit 33 chybějících description** (SEO).
4. **Zavést test/lint gate** — `npm test` + `npm run lint` (momentálně chybí).
5. **Aktualizovat README/ROADMAP** — opravit nepřesné tvrzení o zastaralé cache.
6. **Rozhodnout o 9 stub entitách** — dokončit obsah nebo vyřadit.
