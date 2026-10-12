# Plán: Bezpečný Deezer enrichment (12. 10. 2026)

## Princip: ID-based, ne name-based
Největší riziko Deezeru = záměna interpreta. Proto **NIKDY nehledáme přes jméno**,
ale jen přes **ID, které už máme v databázi** (jednoznačné, ověřené). Kde ID nemáme,
hledáme přes jméno POUZE jako kandidáty → ruční schválení (jako u fotek).

## Co máme (ověřeno)
| Entita | Deezer ID | Chybí |
|--------|-----------|-------|
| Track  | 4 042 / 4 509 | 467 |
| Album  | 529 / 605     | 76  |
| Artist | 21 / 280      | 259 |

## Fáze DZ-1: Track metadata z ID (BEZPEČNÉ, ~30 min)
Pro 4 042 tracků s ověřeným ID dotáhnout z `api.deezer.com/track/{id}`:
- `preview` (30s MP3 URL) → přehrávač ukázek na track stránce 🔥
- `release_date` → chybí u 0/4509
- `bpm` (Deezer má jen u části)
- `track_position`, `disk_number`

Riziko záměny: **nulové** (ID = jednoznačná identita).

## Fáze DZ-2: Album metadata z ID (BEZPEČNÉ, ~15 min)
Pro 529 alb s `deezerId`:
- `label` (chybí 78) → doplnit
- `upc` (chybí 80)
- `genres` (chybí 87) → 🔥 pro dedup žánrů
- `release_date`

## Fáze DZ-3: Artist deezerId (RIZIKOVÉ → kandidáti + ruční schválení)
Pro 259 artistů bez deezerId:
- Vyhledat kandidáty podle jména (API search)
- **Scope guard**: přesná shoda jména (normalizovaně) + ověření přes alba/tracky
- Výstup: kandidáti k ručnímu schválení (jako `deezer-safe-matches.json`)

## Fáze DZ-4: Artist metadata z ověřených ID (po DZ-3)
- `country`, `nb_fan`, `genres` z `api.deezer.com/artist/{id}`

## Co NEDĚLAT
- Nepárovat artisty podle jména automaticky
- Nepřebírat Deezer data, co přepíšou naše kurátorovaná (popisy, žánry)
- Nepřidávat entity, které nejsou CZ/SK rap (scope rule)
