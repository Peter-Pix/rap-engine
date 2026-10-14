# ⚠️ DEPRECATED — phase3 pipeline (sběr dat z Rap Monitoru)

**Status: DEPRECATED (14. 10. 2026)** — nespouštět bez explicitního ověření dat.

## Proč

**Rap Monitor (`rap-monitor.base44.app`) je interní AI sběrná apka.**
Data z něj jsou **AI-generated a vyžadují ověření** — nejsou autorita.

Phase3 pipeline z těchto dat generovala:
- `phase3Pas` (A/B/C klasifikace) — AI odhad
- `themes` / `moods` — AI odhady témat a nálad
- texty písní (přes RM scrapování)
- AI eseje do MDX („O čem je", „Produkce", „Interpretace", „Dopad")

**Všechno výše bylo 14. 10. 2026 z databáze odstraněno** (Fáze 2.2):

| Co | Počet | Commit |
|---|---|---|
| AI eseje v MDX | 1 884 | `c0d1c9227`, `946208971` |
| `extraMeta.themes`/`moods` | 1 829×2 | `634c17fe3` |
| `relations.aiEstimates` (dangling) | 2 169 | `634c17fe3` |
| lyrics metadata | 2 253 | `41ff8feea` |
| Index gate na `phase3Pas` | celý | `6f1668c89` |

## Co zůstalo

`phase3Pas` v `extraMeta` = **historická stopa**, ale **NEROZHODUJE** o indexaci.
Index gate stojí na **faktických signálech**:

```
index   ⟸ artist + délka + (žánr NEBO label NEBO feat NEBO producent) + MDX ≥400
noindex ⟸ jinak
```

## Pravidla pro budoucnost

1. **Rap Monitor není autorita.** Jeho data = AI odhad → vždy ověřit.
2. **Nikdy negenerovat obsah do MDX z AI.** Obsah = fakta (interpret, album,
   rok, délka, hosté, produkce, žánr, label, ISRC, odkazy).
3. **SEO gate nesmí stát na AI klasifikaci.**
4. **Zdroj dat klasifikovat (ověřený vs AI) PŘED použitím.**

## Skripty v této složce

| Skript | Co dělá | Status |
|---|---|---|
| `generate-batch.ts` | generuje AI obsah z RM | ⛔ deprecated |
| `run-c-queue.ts` | fronta pro pás C | ⛔ deprecated |
| `select-batch.ts` | výběr dávek | ⛔ deprecated |
| `upgrade-single-track.ts` | upgrade jednoho tracku | ⛔ deprecated |
| `lib.ts` | utility (norm, slugify, ollama) | ⚠️ utility zůstávají použitelné |
| `status.ts` | stav fronty | ⛔ deprecated |

Detail: `PLAN-AI-SLOP-TRACKS.md` v rootu repa.
