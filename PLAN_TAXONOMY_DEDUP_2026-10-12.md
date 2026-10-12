# Plán: Deduplikace taxonomie (mood/theme/style/genre) — 12. 10. 2026

## Nález: duplicity a nekonzistence
Taxonomie má 124 žánrů + 22 nálad + 35 témat + 24 stylů. Spousta duplicit
(stejný koncept, jiný název) a nekonzistentní pojmenování (lowercase vs
Title Case, mix EN/CZ).

## Jasné duplicity (sloučit — jeden je stub/prázdný)

### GENRE
| Zdroj (hran) | Cíl (hran) | Důvod |
|--------------|-----------|-------|
| r-n-b (5) | rnb (247) | R&B vs R&B (Contemporary) — duplicita |
| world-music (0) | world (2) | mrtvé, smazat |
| newschool-rap (1) | new-school (367) | duplicita |
| trueschool-rap (1) | old-school-rap (34) | duplicita |
| golden-era (0) | (genre) — smazat, existuje style_golden-era | mrtvé |

### THEME
| Zdroj (hran) | Cíl (hran) | Důvod |
|--------------|-----------|-------|
| introspection (255) | self-reflection (514) | SAME koncept — sebereflexe |

### STYLE (nekonzistence EN/CZ pojmenování)
- rnb (3) → melodic? NE — je to žánr, ne styl. Přezkoumat.

## Méně jasné (příbuzné, ale NE slučovat bezhlavě — prodiskutovat)
- alternative (1) / alternative-hip-hop (8) / alternative-rap (12)
- experimental-hip-hop (1) / experimental-rap (13) / experimental-trap (1)
- underground-hip-hop (2) / underground-rap (11)
- hip-hop (183) vs hip-hop-production (1)
- new-school (367) vs new-wave (9)

## Nekonzistence v pojmenování (opravit title, ne slučovat)
- Lowercase: `electro`, `newschool-rap`, `old-school-rap`, `trueschool-rap`
  → měly by být Title Case jako zbytek
- STYLE: mix češtiny (Chytlavý, Emocionální) a angličtiny (Aggressive, Melodic)

## Postup
1. Sloučit jasné duplicity (merge: přesměrovat hrany, smazat stub)
2. Opravit title case nekonzistence
3. Prodiskutovat "méně jasné" s uživatelem (sémantické rozhodnutí)

## Bezpečnost
- Merge script s DRY_RUN + záloha
- Přesměrovat VŠECHNY hrany (HAS_GENRE, genre→genre, track, album)
- Idempotentní
