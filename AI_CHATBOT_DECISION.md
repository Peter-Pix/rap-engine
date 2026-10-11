# AI vrstva pro 4rap.cz — rozhodovací analýza

**Datum:** 2026-10-11
**Otázka:** Má smysl implementovat AI (chatbot/ask) nad knowledge graph? A pokud ano, jak nejlíp?

---

## 1. Co reálně máme (ověřeno na datech)

| Entita | Počet | Obsah |
|--------|-------|-------|
| Track | 4 490 | **2 253 bohatých** (5 sekcí, 1-2 KB) / 2 237 stubů |
| Artist | 283 | **112 bohatých** (2+ KB, biografie + diskografie) / 112 prázdných |
| Album | 604 | ? |
| Genre / Style / Mood / Theme | 206 | krátké popisy |
| Label / Location / Producer | 152 | tenké |

**Graf:** 26 204 hran, 16 typů:
- `HAS_ARTIST` 4 491, `BELONGS_TO_ALBUM` 4 082, `HAS_TRACK` 3 952
- `HAS_GENRE` 3 525, `RELEASED_BY` 2 878, `HAS_MOOD` 1 429, `HAS_THEME` 1 361
- `RELATED_ARTIST` 1 222, `RELATED_TO` 1 110, `HAS_ALBUM` 656, `HAS_STYLE` 610
- **`FEATURES` 347** ← kolaborace (TENKÉ)
- `ORIGINATES_FROM` 308, `BELONGS_TO_SCENE` 116, `PRODUCED_BY` 103, `PART_OF` 14

**Infra:** Ollama Cloud klíč v `.env.local`. MiniSearch (1,36 MB / 5 765 docs / Ø 242 znaků). Veřejné API v1.

**Kritické zjištění:** Iso Alp v DB **NENÍ** (uživatelův příklad míří na chybějící entitu).
→ AI **musí** umět říct „tohle nemáme", ne halucinovat.

---

## 2. Plusy

1. **Data na to jsou** — 2 365 entit s bohatým obsahem = reálný RAG korpus.
2. **KG struktura existuje** — 16 typů hran umí odpovědět na žánr, náladu, původ, label, produkci.
3. **Diferenciátor** — nikdo v CZ rapu nemá AI nad strukturovaným KG. Nové = wow.
4. **Retrieval zdarma** — MiniSearch už je, bez embeddings a vektorové DB (řeší 8GB constraint).
5. **Infrastruktura hotová** — Ollama klíč, API v1, cache pipeline.
6. **Ověřitelnost** — každá odpověď může citovat entitu (odkaz na stránku) = důvěryhodnost.

## 3. Mínusy (poctivě)

1. **Tenké kolaborace** — 347 FEATURES hran. „S kým nejčastěji spolupracoval X" funguje u ~10 % artistů.
2. **Nekonzistentní obsah** — artist (`## O rapperovi`, tabulky) vs track (`## O čem je`). RAG musí zvládnout obojí.
3. **112 prázdných artistů** — dotaz na ně = prázdno. Frustrující.
4. **Náklady** — každý dotaz = LLM call. Cloud ≠ zdarma. Nutný rate limit + cache odpovědí.
5. **Latence** — 2-5 s = zabíjí wow efekt. Apple design = instant feelling (streaming + skeletony).
6. **Halucinace** — bez striktního groundingu si LLM vymyslí. U „důvěryhodného KG" fatální.
7. **Maintenance** — nový subsystém (prompt tuning, evaluace, ground-truth testy).

## 4. Verdikt

**ANO, má smysl — ale NE jako „chatbot, který odpoví na cokoliv".**

❌ **Volný chat** (odpovídá z hlavy) → narazí na mínusy 1, 3, 6. Vymyšlená kolaborace =
ztráta kreditu. Přesně to, co nechceme u důvěryhodného KG.

✅ **Grounded explorativní vrstva** — AI, která:
- **Retrieval-first**: nejdřív najde entity v KG, pak generuje POUZE z nich
- **Cituje**: každé tvrzení má odkaz na entitu → ověřitelné
- **Umí říct „nevím"**: „Iso Alp v databázi nemáme" (ne halucinace)
- **Guided**: místo prázdného inputu nabízí otázky, které data reálně unesou
- **Streamuje**: první token < 1 s = wow, ne čekání

### Architektura (bez vektorové DB — 8GB constraint)

```
User dotaz
  → MiniSearch retrieval (top-N entit, už máme)
  → Graph expansion (hrany z nalezených entit — kontext)
  → Kontext (~20 KB, top-8 entit + jejich hrany)
  → Ollama Cloud (grounded prompt: "odpovídej JEN z kontextu, cituj")
  → Streaming odpověď + inline citace entit
```

**Proč bez embeddings:** search-index se vejde do promptu, MiniSearch stačí, žádná
vektorová DB, žádné embedding modely. Řeší to 8GB Mac.

### Fázování (rozhodujeme se podle prvního kroku)

- **Fáze 0 — Spike (1-2 h):** Důkaz konceptu na 5 reálných dotazech. MiniSearch + Ollama,
  hardcoded prompt. Změříme: kvalitu odpovědí, latenci, halucinace. **Bez UI.**
  → Pokud špatné, STOP (ušetřeno X hodin).
- **Fáze 1 — Grounded API (0,5 dne):** `/api/ask` route, retrieval + graph expansion + prompt.
  Ground-truth testy (10 dotazů, ověřitelné odpovědi).
- **Fáze 2 — UI (1-2 dny):** Apple-style panel, streaming, citace, guided chips.
- **Fáze 3 — UX detail:** cache, rate limit, fallbacky, mobil.

### Rozhodovací kritéria pro Fázi 0 (go/no-go)
| Kritér | Práh |
|--------|------|
| Odpoví správně na 4/5 testovacích dotazů | ano/ne |
| Umí říct „nevím" u chybějící entity (Iso Alp) | ano/ne |
| Žádná vymyšlená kolaborace/track | ano/ne |
| Latence < 3 s (first token < 1 s) | ano/ne |

**Pokud ≥3 kritéria projdou → pokračovat do Fáze 1.**
**Pokud <3 → nedělat, ušetřeno.**

### Co NEDĚLAT
- ❌ Volný chat bez groundingu
- ❌ Vektorová DB / embeddings lokálně
- ❌ Odpovídat na cokoliv (radši guided otázky)
- ❌ Slibovat kolaborace, které v datech nejsou
