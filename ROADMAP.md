# 4rap.cz (rap-knowledge-graph) — Roadmapa

> **Stav:** Live na 4rap.cz. 1701 entit (13 typů), ~5600 hran, Next.js 16 + MDX. Branch `13-7-26-backup`.
> **Planner:** The Strategist (Sovereign OS) · 2026-08-30 · vstup z `planner/state.md` (Archivist audit)
> **Formát:** atomické tasky (~5 min), řazené Základ → Funkce → Marketing → Dokumentace. Builder je čte a odškrtává.

## Co to je
Operační systém pro českou rapovou scénu — propojená znalostní báze interpretů, alb, labelů, lokalit, producentů, žánrů.

## Cíl
Zpevnit data pipeline (zelený build gate) a rozšířit obsah (scope rule: CZ/SK rap only).

---

## Fáze A — Data pipeline: zelený build gate (Základ, nejvyšší priorita)

> **Proč:** `npm run cache:validate` FAILUJE (6 errors + 39 warnings). Nevalidní entity jsou v produkci. Tohle je blocker pro všechno ostatní — dokud není gate zelený, každý build je risk.

- [x] A1: Opravit `artist_filip-konvalinka` — doplnit `id` + `slug` do `meta.json` (5 min)
- [x] A2: Opravit `artist_if` — doplnit `id` + `slug` do `meta.json` (5 min)
- [x] A3: Rozhodnout osud 2 prázdných MDX (`artist_filip-konvalinka`, `artist_if`) — doplnit obsah NEBO odstranit entity (5 min)
- [x] A4: Vyčistit dangling relations — odstranit/opravit odkazy na rozbité entity z 5 alb (`album_2-mouchy-1-ranou`, `album_if`, `album_rap`, `album_rep`, `album_stop-play`) (5 min)
- [x] A5: Opravit `article_nenadavam-protoze-me-to-bavi` — klíč `"relations"` mimo registry (5 min)
- [x] A6: Spustit `npm run cache:validate` — ověřit 0 errors (5 min)
- [x] A7: Spustit `npm run cache:build` — rebuild cache po opravách (5 min)
- [ ] A8: Ověřit, že build gate je zelený — `npm run build` exit 0 (5 min)

## Fáze B — Testy a regresní ochrana (Základ)

> **Proč:** Žádný test/lint script v package.json. Bez regresní ochrany je 98-skriptová pipeline křehká.

- [ ] B1: Přidat `"test"` script do package.json (minimální smoke test cache) (5 min)
- [ ] B2: Přidat `"lint"` script do package.json (5 min)
- [x] B3: Napsat 1 test na `cache:validate` — assert 0 errors (5 min)
- [x] B4: Napsat 1 test na build cache konzistenci (cache novější než poslední MDX edit) (5 min)
- [ ] B5: Spustit `npm test` + `npm run lint` — ověřit exit 0 (5 min)

## Fáze C — Obsah: rozšíření (Funkce)

> **Proč:** Víc kvalitního obsahu = víc SEO návštěvnosti = víc hodnoty platformy.

- [x] C1: Doplnit 33 chybějících `description` do meta.json (SEO) — batch skript (5 min)
- [x] C2: Rozhodnout osud 9 stub entit — dokončit obsah NEBO vyřadit (5 min)
- [x] C3: Ověřit import z raw-data (`15profilu/`, `9rappers/`, `10/`, `genre/`) — entity konzistentní (5 min)
- [x] C4: Přidat 1 nového interpreta (workflow: 1 rapper = 1 commit) (5 min)
- [ ] C5: Rozšířit lokality — 1 nové město/region CZ/SK (5 min)

## Fáze D — Marketing a vnímání (Marketing)

> **Proč:** Zlepšit vnímání projektu navenek — landing, OG image, SEO, dokumentace.

- [x] D1: Ověřit OG image — správně se renderuje na sdílení (5 min)
- [x] D2: Ověřit homepage + `/raperi/` + `/lokality/` po rebuild (5 min)
- [ ] D3: Ověřit sitemap.xml + robots.txt (5 min)
- [ ] D4: Zkontrolovat structured data (JSON-LD) na detailu interpreta (5 min)
- [ ] D5: Ověřit, že `/hledat` fulltext funguje (5 min)

## Fáze E — Dokumentace (Dokumentace)

> **Proč:** README je výborné, ale cache tvrzení bylo zastaralé. Udržet dokumentaci v sync s realitou.

- [ ] E1: Ověřit, že README cache tvrzení odpovídá realitě (13. 8. > 19. 7.) (5 min)
- [ ] E2: Ověřit, že ROADMAP Fáze A–E odpovídá skutečnému stavu (5 min)
- [ ] E3: Rozhodnout osud `amp` souboru (308 B) v rootu — odstranit nebo zdokumentovat (5 min)

---

## Blokery
- **Scope rule:** CZ/SK rap only, foreign feat-only = DELETE.
- **Build gate:** `npm run cache:validate` FAILUJE (6 errors — 2 rozbité stub entity `artist_filip-konvalinka`, `artist_if`; 39 warnings). **Fáze A to řeší.**
- **Deploy:** Bez explicitního povolení se nedeployuje (Vercel).
