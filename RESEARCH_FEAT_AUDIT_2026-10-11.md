# Rešerše dat a featů — audit + výsledky | 2026-10-11

> **Metoda:** ověřeno skripty proti reálným datům (ne z paměti).
> **Branch:** `main` · **Commity:** `2ba0cb8a9`, `9ac196d36`, `95814bde3`, `94b9dbeb0`

---

## 1. Stav před auditem (nesprávná očekávání z plánů)

Plán `PLAN_COMMON_GROUND_V2.md` + `FACTCHECK_AND_PLAN_DATA_ENRICHMENT.md` tvrdil:
- 5 skladeb s featuring (1,2 %) → „jádro problému"
- Deezer: 247 matchů k dispozici
- RM: 79 chybějících skladeb (Smack One 19, Hugo Toxxx 14, Ego 11…)
- Pás A = 16 vs plánovaných 377

## 2. Reality check (skripty, 11. 10. 2026)

| Vrstva | Reálný stav |
|---|---|
| FEATURES hran (před) | 353 / 289 tracků / 121 hostů |
| RM feat. plán (17 tracků / 26 vazeb) | **16 z 17 už zapsáno** — chyběla 1 |
| RM s AI analýzou (441) | **u nás chybí 0** — pokrytí kompletní |
| Pás A v našich entitách | **429 tracků** (ne 16/377) |
| Vladimír 518 | **44 tracků = kompletní** |

**Závěr:** rešerše byla z ~97 % vytěžená. Plány nadhodnocovaly díry.

## 3. 🔴 KLÍČOVÝ NÁLEZ: záměna jmen v RM (scope risk)

RM má pod stejnými jmény **jiné umělce**:

| RM jméno | Realita | Verdikt |
|---|---|---|
| `Smack One` | zahraniční EDM („Sweet Dreams", „Paint It Black") | ❌ MIMO SCOPE |
| `Ego` (část) | polský rapper („Fenomenalny Miernik", „Baju O Baju") | ❌ MIMO SCOPE |
| `Ego` (část) | **slovenský Ego** („Cavani", „5 Minut", „Symbol") | ✅ OK |
| `Orion` | český Orion (PSH) — texty CZ, „Teritorium III" | ✅ OK |
| `Karlo` | anglické texty | ❌ MIMO SCOPE |

→ **Bez scope guardu by import zanesl ~20 cizích skladeb.**

## 4. Co bylo reálně doplněno

| Commmit | Obsah |
|---|---|
| `2ba0cb8a9` | feat vazba Stein27 × Sofian Medjmedj (z RM) |
| `9ac196d36` | **12 skladeb Hugo Toxxxe** (Rok psa, 1000, Legální drogy) |
| `95814bde3` | **39 skladeb** z 14 interpretů (Orion 8, Ego 6, Porsche Boy 4, Smack 3, SHIMMI 3, Ektor 3, 7krát3 3, Annet X 2, Sensey 2, Michajlov, Protiva, Marpo, Paulie Garand, CA$HANOVA BULHAR) |
| `94b9dbeb0` | feat vazby z titulů (Rytmus×H16, Čistychov×Miky Mora/Orion) |

**Výsledek:** FEATURES 354 → **357**, track entity 5 745 → **5 796**

## 5. Bezpečnostní mechanisms (co použít znovu)

1. **Whitelist scope-guard** — `WHITELIST_FILE` v `import-rm-lyrics-tracks.ts`. Importuje POUZE ručně ověřené dvojice (artist+title). Chrání před záměnou jmen.
2. **Kvalitativní gate** — totalLen ≥ 400, ≥3/5 sekcí, hedge < 30 %, bez zakázaných frází. Gate-fail → `noindex` zůstává.
3. **`noindex: true` default** — sundá ho až gate. Konzervativní start.
4. **Idempotence** — existující slug → skip.
5. **Texty se NEZAPISUJÍ** — jen jako AI vstup (autorská práva).
6. **Záloha před zápisem** — `.backups/pre-rm-enrich-*.tar.gz`.
7. **pre-commit hook** — kontrola regrese obsahu (>30 % úbytek blokuje commit).

## 6. Skripty (nové)

- `scripts/import-rm-lyrics-tracks.ts` — import chybějících skladeb, kde RM má jen texty → vlastní AI analýza. Podporuje `RM_ARTIST` i `WHITELIST_FILE`.

## 7. Zbývající mezery (ověřené, reálné)

- **Annet X — VARIANTE 2** (`track_annet-x-varianta-2`) — stub, RM text existuje → kandidát na upgrade.
- **Hosté, kteří v DB neexistují** (11): Taomi, Teri Blitzen, DZK, Cryptic Wisdom, Adil Omar, Bony, klid, Ivan Hoe, Katerina Winterova, Ridina Ahmedova, RebMoe → feat vazbu nelze zapsat bez nové artist entity. Rozhodnutí: založit stub entity? (scope: CZ/SK vs zahraničí)
