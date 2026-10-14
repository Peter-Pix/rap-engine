# PLAN — Odstranění AI slopu z tracků (Fáze 2.2)

**Datum:** 14. 10. 2026
**Kontext:** Rap Monitor = Peterova AI apka. Jeho data (`themes`, `moods`,
AI eseje „O čem je", `phase3Pas`) jsou AI-generated a musí se ověřit.

## Rozsah (změřeno 14. 10. 17:25)

| Typ | Počet | Status |
|---|---|---|
| MDX „## O čem je" (AI esej) | **1 815** | 🔴 AI slop — prochází gate! |
| MDX „## Témata a nálada" | 69 | 🔴 AI slop |
| `extraMeta.themes` + `.moods` | 1 829 | 🔴 AI odhad |
| `extraMeta.lyrics` (sourceLyrics: rap-monitor) | 2 073 | ⚠️ AI zdroj |
| `extraMeta.phase3Pas` (AI klasifikace) | 4 013 | ⚠️ AI jako gate |

## Bezpečnostní pravidla
1. Dry-run vždy první.
2. Backup do `.backups/` před `--write`.
3. Jeden krok = jeden commit.
4. Po každém kroku: rebuild cache + `npm test` (118/118).
5. Žádné mazání bez prokazatelného důvodu.
6. Nikdy nesundat `noindex` bez splnění faktického gate.

## Krok 2.2.1 — Odstranit AI esej „## O čem je"
Nahradit faktickým obsahem (builder z 2.1b). Tracky spadnou pod 400 → noindex.
To je SPRÁVNĚ (radši neindexovat než indexovat AI slop).
- Backup → dry-run → vzorek → --write → cache → testy → commit.

## Krok 2.2.2 — Faktický gate místo AI klasifikace
Nový gate: `index ⟸ album + artist + délka + (žánr NEBO label)`.
`phase3Pas` zůstane jako stopa, ale nerozhoduje o indexaci.

## Krok 2.2.3 — Vyčistit extraMeta od AI dat
themes/moods → aiEstimates nebo smazat. lyrics → ověřit původ.

## Krok 2.2.4 — Ověřit feat data z Rap Monitoru (88 tracků)

## Durable lekce
- Zdroj dat klasifikovat (ověřený vs AI) PŘED použitím.
- Vlastní AI apka ≠ autorita.
- Označený AI obsah je pořád AI obsah.
- SEO gate musí stát na faktických signálech, ne na AI klasifikaci.
