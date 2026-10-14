# PLAN — Fáze 2: SEO score 30 → 65+

**Datum:** 14. 10. 2026

## Diagnóza (live data)

```
Celkem:      8 366 entit
avgScore:    30/100
Indexable:   7 413 (89 %)
Noindex:       713
```

### avgScore podle typu
| Typ | n | avg | Problém |
|---|---|---|---|
| album | 604 | **57.6** | OK |
| artist | 278 | **57.0** | OK |
| genre | 116 | 44.9 | slabší |
| label | 93 | **28.0** | slabé |
| track | **7 151** | **26.8** | 🔴 sráží celek |

### Signály (co chybí)
| Signál | Stav | Dopad |
|---|---|---|
| `hasImage` | 28 % | 🔴 obaly/fotky chybí |
| `hasFaq` | **0 %** | 🔴 nikde není FAQ |
| `hasSchema` | 39 % | 🔴 strukturovaná data chybí |
| `contentLength` | median **174** | 🔴 málo textu |
| `backlinkCount` | median **1** | 🔴 slabé prolinkování |
| `descriptionLength` | median 52 | 🟡 krátké popisy |

### Klíčový insight
**Tracky (7 151) mají avg 26.8** a tvoří 85 % entit → **sráží průměr celé DB.**
Když zvedneme tracky na 50+, avg DB skočí na ~50.

## Kroky (priorita podle dopadu × náklad)

### 2.1 — Tracky: délka + žánr do meta (quick win, velký dopad)
- Délka a žánr **už jsou v `tracks.json`**, jen ne v `meta.json`
- Backfill → `contentLength` ↑, `descriptionLength` ↑
- **Dopad:** 7 151 entit × +20–30 score
- Náklad: skript, 20 min

### 2.2 — FAQ bloky (0 % → 50 %+)
- Šablona: "Kdo je X?", "Kdy vyšlo Y?", "S kým spolupracoval Z?"
- Generovat z **existujících strukturovaných dat** (ne AI!)
- **Dopad:** `hasFaq` 0 → 4 000+
- Pozor: musí být faktické, ne AI slop

### 2.3 — Obaly (220 chybějících)
- Deezer/Spotify cover URL → `image`
- **Dopad:** `hasImage` 28 → 60 %
- Náklad: 60–90 min

### 2.4 — Schema.org (39 % → 90 %)
- JSON-LD pro album/artist/track
- **Dopad:** `hasSchema` ↑, rich snippets
- Náklad: 60 min

### 2.5 — Prolinkování (backlink median 1)
- "Podobní umělci", "Další alba", "Hosté na tracku"
- **Dopad:** `backlinkCount` 1 → 5+
- Náklad: 60 min

### 2.6 — Popisy (median 52 znaků)
- Rozšířit na 150+ znaků z dat
- Pozor: ne AI slop, použít fakta (alba, roky, spolupracovníky)

## Pořadí
1. **2.1 tracky** (největší dopad, nejmenší náklad)
2. **2.2 FAQ** (0 % → velký skok)
3. **2.4 schema** (technické, rychlé)
4. **2.5 prolinkování** (síťový efekt)
5. **2.3 obaly** (nákladné, ale vysoký dopad)
6. **2.6 popisy** (doladění)

## Bezpečnost
- Každý krok: dry-run → `--write` → validace (0 dangling) → testy → commit
- Záloha před každým krokem
- **Žádný AI generovaný text** — jen fakta z dat (jinak zpět AI slop)

## Odhad celkem: ~5–6 h práce
