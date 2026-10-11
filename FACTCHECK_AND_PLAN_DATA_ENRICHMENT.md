# Fact-check dat + plán obohacení
**Datum:** 2026-10-11 · **Branch:** `13-7-26-backup` @ `a3d06e1c6`
**Metoda:** ověřeno přímo na datech (meta.json, entity.mdx, indexation-state.json,
coverage-audit.json, rm-songs.json). Ne z paměti.

---

## 1. Fact-check — co je reálně v datech

### 1.1 Entity (ověřeno z `.content-cache/entities.json`, 16:22)
| Typ | Počet |
|---|---|
| track | 4 473 |
| album | 604 |
| artist | 283 |
| genre | 125 |
| label | 94 |
| location | 42 |
| theme | 35 |
| style | 24 |
| mood | 22 |
| article | 17 |
| producer | 16 |
| collective | 8 |
| scene | 5 |
| **CELKEM** | **5 748** |

### 1.2 Indexace (ověřeno z `.content-cache/indexation-state.json`, 14:22)
| State | Počet |
|---|---|
| AUTHORITATIVE | 739 |
| INDEXABLE | 2 212 |
| CANDIDATE | 320 |
| NOINDEX | 2 367 |
| DRAFT | 110 |
| **CELKEM** | **5 748** |

### 1.3 Tracky — obsah vs noindex (klíčová tabulka)
| Metrika | Hodnota | Poznámka |
|---|---|---|
| Tracků celkem | 4 473 | |
| **Bohatý obsah (MDX > 1 KB)** | **2 236** | |
| **Stub (NOINDEX, ~105 B)** | **2 237** | přesně 1:1 |
| Indexovatelné tracky | 2 236 | INDEXABLE+AUTHORITATIVE+CANDIDATE |
| NOINDEX tracky | 2 237 | |
| Indexovatelných s contentLength < 400 | **0** ✅ | invarianta „žádný indexovatelný thin content" DRŽÍ |

### 1.4 Pásy fáze 3 (ověřeno z meta.json na disku, 4 473 souborů)
| Pás | Počet | Význam |
|---|---|---|
| A (RM analýza) | **16** | |
| B (texty → vlastní AI) | 1 793 | |
| C (holá metadata) | 2 237 | noindex zůstává |
| none (staré, před fází 3) | 427 | z toho 424 bohatých MDX |

### 1.5 ⚠️ ROZPOR: Pás A = 16 vs plán sliboval 377
**Plán `PLAN_PHASE_3_CONTENT.md` tvrdil Pás A = 377 skladeb (RM analýzy).**
**Skutečnost: Pás A = 16.** Vysvětlení (ověřeno):

- RM má **441 skladeb s `ai_analysis`** (potvrzeno v `rm-songs.json`).
- Z nich ~407 bylo importováno **už v červenci 2026** (commit `002540216`, „batch import
  407 RapMonitor analyzed tracks") — tyto mají bohatý MDX a `phase3Pas: none`.
- Filtr `select-batch` vyřazuje tracky s `content.length > 600` jako hotové.
  → Těch 407 RM-bohatých tracků **nebylo do fronty zařazeno**, protože už obsah měly.
- Pás A proto obsahoval jen 16 RM-rich skladeb, které ještě obsah neměly.

**Závěr: žádný obsah se neztratil.** RM-obohacených tracků je ~423 (407 starých + 16 nových).
Rozpor je pouze v **pojmenování/statistice**, ne v datech. Plán míchal „377 RM analýz
dostupných" s „377 k zpracování".

### 1.6 RM zdroje — reálné pokrytí (`rm-songs.json`, 3 090 skladeb)
| Metrika | Počet |
|---|---|
| RM skladeb celkem | 3 090 |
| s `ai_analysis` (>50 znaků) | **441** |
| s `lyrics_text` (>100 znaků) | **543** |
| RM-rich, které u nás NEJSOU (dle titulu) | 15 (převážně SHIMMI) |
| RM-lyrics, které u nás NEJSOU | 80 |

### 1.7 Léčky / falešné signály (co NEVĚŘIT)
- **`generatedFrom: "rap-monitor"` má jen 94 tracků**, ale RM-obohacených je ~423.
  Pole sleduje, odkud entita vznikla, **ne** odkud přišel obsah. → Nepoužívat pro tracking zdroje obsahu.
- **`lyricsLastStatus: 200` = NENALEZENO** (genuine miss), ne „nalezeno"!
  Kód: `let lrcStatus = 0; // 200 = genuine miss, 503/0 = transient`.
- **Pás C (2 237) nemá texty nikde** — ani RM `lyrics_text`, ani RM `ai_analysis` (ověřeno: 0 z 2 237).
  LRCLIB je nenašel (status 200). **Není co upgradovat z existujících zdrojů.**

---

## 2. Plán obohacení dat

### Priorita 1 — Chybějící RM obsah, který existuje (rychlé, zdarma)
**Co:** 15 RM-rich + 80 RM-lyrics skladeb, které v naší DB nejsou (dle titulu).
**Vzorek:** SHIMMI (STUDIO 51, marec, YOKO ONO, PULZ X, 808SEX, ILUMINATI, Ideas, W!LD, BEZ SLOV RMX, YAK…).
**Kroky:**
1. Ověřit, zda jde o reálné mezery (jiný slug / feat) vs skutečně chybějící entity.
2. Pro chybějící: import entity (track + vazba na artistu) → obsah z RM.
3. SHIMMI jako samostatná entita (artista) — pokud chybí, doimportovat.
**Odhad:** 1-2 h · **Dopad:** +~95 tracků s obsahem.

### Priorita 2 — RM lyrics → dobohatit stávající B/C tracky, kde RM text existuje
**Co:** Zjistit, kolik našich tracků má `lyricsLastStatus: 200` (LRCLIB miss), ale RM `lyrics_text` má.
**Kroky:**
1. Cross-match: naše tracky × RM `lyrics_text` (>100 znaků).
2. Ty, co najdou text, přepnout z C→B, spustit vlastní AI analýzu → sundat noindex.
3. Ověřit kvalitativním filtrem (≥400 znaků, ≥3/5 sekcí, hedge <30 %).
**Odhad:** 2-3 h · **Dopad:** potenciálně stovky tracků C→B.

### Priorita 3 — Rozšířit RM pokrytí (externí, dražší)
**Co:** RM má 3 090 skladeb, my 4 473. 2 621 RM skladeb je „pending" (bez analýzy).
**Kroky:**
1. Fetch nové RM analýzy (pokud přibyly od 10. 10.).
2. Pro naše tracky bez RM: dopočítat vlastní AI analýzu (Ollama Cloud, 6 paralelně).
**Odhad:** 3-5 h · **Dopad:** střední (text musí existovat).

### Priorita 4 — Kvalita Pásu B (audit + případný re-run)
**Co:** 1 793 B-tracků prošlo vlastní AI analýzou. Ověřit kvalitu (hedge ratio, dedup, template fallback).
**Kroky:**
1. Audit vzorku 50 B-tracků: hedge ratio, duplicity textu, konkrétnost.
2. Pokud najdeme slabé → re-run s lepším promptem.
**Odhad:** 2 h · **Dopad:** kvalita, ne kvantita.

### Priorita 5 — Fáze 5 rozšíření + interní prolink
- BFS „spojuje je X" je hotové (fáze 5). Rozšířit na víc dvojic? Až po obsahu.

---

## 3. Co NEDĚLAT
- ❌ Nesnažit se o upgrade Pásu C z LRCLIB — texty nejsou (status 200 = genuine miss).
- ❌ Nevěřit `generatedFrom` pro tracking zdroje obsahu.
- ❌ Nemíchat „dostupné RM analýzy" s „ke zpracování" ve statistikách.

## 4. Doporučené pořadí
1. **P1** (RM mezery) — rychlé, konkrétní, ověří cross-match pipeline.
2. **P2** (RM lyrics → C→B upgrade) — největší potenciální dopad.
3. **P4** (audit B kvality) — mezitím, levné.
4. **P3** (rozšíření RM) — nejdražší, až po ověření P1/P2.
