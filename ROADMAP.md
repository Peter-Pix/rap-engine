# 4rap.cz (rap-knowledge-graph) — Roadmapa

> Stav: Live na 4rap.cz. 1701 entit (13 typů), ~5600 hran, Next.js 16 + MDX. Branch `13-7-26-backup`.

## Co to je
Operační systém pro českou rapovou scénu — propojená znalostní báze interpretů, alb, labelů, lokalit, producentů, žánrů.

## Cíl
Zpevnit data pipeline a rozšířit obsah (scope rule: CZ/SK rap only).

## Fáze

### Fáze 1 — Data pipeline (teď)
- [ ] Rebuild build cache (.content-cache) — cache je zastaralá proti poslednímu commitu
- [ ] Ověřit import z raw-data (15profilu/, 9rappers/, 10/, genre/) — entity konzistentní
- [ ] Validace grafu: žádné chybějící/duplicitní hrany

### Fáze 2 — Obsah (hotové + rozvoj)
- [ ] Přidat nové interprety/alb (workflow: 1 rapper = 1 commit)
- [ ] Rozšířit lokality (další města/regiony CZ/SK)
- [ ] Feat-only zahraniční → NEDÁVAT (scope rule)

### Fáze 3 — Web (produkce)
- [ ] Ověřit homepage, /raperi/, /lokality/, sitemap, OG image po rebuild
- [ ] SEO: meta, structured data

## Blokery
- Scope rule: CZ/SK rap only, foreign feat-only = DELETE.
- Build cache je zastaralý (11. 7. vs poslední commit) — nutný rebuild před deployem.
