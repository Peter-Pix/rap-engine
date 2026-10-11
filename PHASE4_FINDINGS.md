# Fáze 4 — zjištění (2026-10-11)

## Zadání
Povýšit 1 609 stub tracků (generický description `Skladba „X" od Y.`) na plnohodnotné entity.

## Zjištění: zdroje textů jsou vyčerpané

| Zdroj | Pokrytí stubů | Poznámka |
|---|---|---|
| **LRCLIB** | **1 / 20 (5 %)** | Testováno na vzorku 20 stubů. Pro CZ rap nemá texty (mezinárodní DB, anglická dominance). 2× 503 = rate limit. |
| **RM `ai_summary_short`** | 4 tracky | 446 z 450 už dobrý description má |
| **RM AI metadata** (atmosphere/motifs) | 1 track | Stuby se s RM AI záznamy téměř nepotkávají |
| **RM texty bez analýzy** | 130 skladeb | ⚠️ **nevyužitý zdroj** — RM má texty, ale nemá AI analýzu |

## Klíčový insight
Stuby vznikly z Deezeru (pás C) — holá metadata bez textu. **Texty k nim neexistují v žádné dostupné DB.**
Bez textů nelze dělat AI analýzu → nelze povýšit na plnohodnotné entity.

**Generický description je tedy správný signál** — `noindex: true` + `isStub: true` říká vyhledávači "nemám obsah".
Tohle není bug, je to feature. SEO gate funguje.

## Co má smysl udělat místo toho

**A) Vytěžit 130 RM skladeb s texty bez analýzy** → vlastní AI analýza → +130 povýšených entit.
   To je jediná reálná content mezera se zdrojem.

**B) Zobrazit obal alba na track stránce** (frontend).
   2 304 tracků má album s obalem → hero by ho mohl ukázat. Vizuální dopad, žádná data.

**C) Nechat stuby být.** Jsou správně označené, neindexují se.
