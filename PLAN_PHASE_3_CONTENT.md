# Fáze 3 — Doplnění obsahu skladeb

> Cíl: dostat 4 046 `noindex` skladeb do stavu, kdy mají reálný obsah
> a můžou se indexovat. Po dávkách 100, ověřitelně, bez rizika.

**Datum:** 11. 10. 2026
**Výchozí stav:** 5 748 entit, 4 473 skladeb, z toho 4 046 `noindex`

---

## 1. Diagnóza — co reálně máme

Audit (`.data/coverage-audit.json`) ukázal tři vrstvy zdrojů:

| Zdroj | Pokrytí našich skladeb | Kvalita |
|---|---|---|
| **Rap Monitor** (vlastní AI analýzy) | 855 záznamů · **377 s analýzou** · 393 s texty | ⭐⭐⭐ kritický hlas, konkrétní |
| **LRCLIB** (open source texty) | ~50 % skladeb bez RM dat → **~1 800 odhad** | ⭐⭐ jen text, žádná analýza |
| **Ollama Cloud** (vlastní generování) | 100 % (cokoli) | ⭐⭐ popisný, potřebuje lepší prompt |

**Klíčové zjištění:** AI analýza má hodnotu **jen s textem skladby**. Bez textu model
vyměkne do „pravděpodobně", „neznámý producent", „nelze interpretovat" — viz test
`track_dame-100ry`, kde polovina výstupu byla hedge.

**Vlastní metadata máme slušná:** duration 4 239 · isrc 3 895 · album 4 082 · feat 285.
Chybí hlavně texty a interpretace.

---

## 2. Strategie — tři pásy podle kvality dat

Nezalévat databázi jedním typem obsahu. Rozdělit podle toho, **co o skladbě víme**:

### Pás A — „Bohatá" (RM má analýzu + texty) — 377 skladeb
- **Obsah:** RM `ai_analysis`, `ai_summary_long`, `ai_motifs`, `ai_atmosphere`, `ai_emotions`,
  `tags_*`, `producer`/`beatmaker` + `lyrics_text`
- **Kvalita:** nejvyšší, redakční hlas
- **Zápis:** MDX s 5 sekcemi (O čem je / Kontext / Produkce / Interpretace / Dopad)
- **Indexace:** `noindex` se **sundá** ✅

### Pás B — „Text bez analýzy" (RM texty nebo LRCLIB) — ~2 200 skladeb
- **Obsah:** text skladby → vlastní AI analýza (Ollama, ale s **přísnějším promptem**)
- **Kvalita:** dobrá — analýza vychází z reálného textu
- **Zápis:** strukturované `extraMeta` sekce (summary/context/production/interpretation/impact)
- **Indexace:** `noindex` se sundá **jen** když výstup projde kvalitativním filtrem (viz §5)

### Pás C — „Holá metadata" (jen title/album/duration) — ~1 900 skladeb
- **Obsah:** metadata stránka (album, délka, ISRC, feat propojení, odkaz na Deezer/Spotify)
- **Zápis:** `extraMeta` sekce, ale bez fabulace
- **Indexace:** **zůstává `noindex`** — tenhle pás nemá nikdy dost obsahu na plnou indexaci

---

## 3. Zdroje textů — priorita

Pořadí, jak skladbu obohatit:

1. **RM `lyrics_text`** (393) — už máme, jen přenést
2. **LRCLIB search** (~50 % úspěšnost) — `artist_name` + `track_name`, hledat `plainLyrics > 100`
3. **RM `ai_analysis`** bez textu (377) — máme hotovou analýzu, přeneseme
4. **Vlastní AI generování** — jen pro Pás B, kde máme text

Pro zbylých ~1 900 (Pás C) se **nesnažíme shánět text** — nemáme na to zdroj a fabulovat se nesmí.

---

## 4. Workflow po dávkách 100

Každá dávka 100 skladeb projde 6 kroky:

```
1. VYBER    — 100 skladeb s noindex, seřazené podle kvality zdroje (Pás A → B → C)
2. ZÍSKEJ   — dohledej texty (RM → LRCLIB), doplň metadata (Deezer ISRC/BPM)
3. GENERUJ  — vlastní AI analýza (jen Pás B, kde máme text)
4. ZAPIŠ    — MDX nebo extraMeta sekce do entity
5. OVĚŘ     — kvalitativní filtr (§5), sundat noindex jen když projde
6. REPORT   — souhrn + commit
```

**Proč 100:** velikost umožní manuální kontrolu vzorku, rollback po jedné dávce,
a build se nedělá po každé dávce (až po dokončení celého pásu).

### Skripty (k vytvoření)

| Skript | Funkce |
|---|---|
| `scripts/phase3/select-batch.ts` | vybere 100 skladeb podle priority pásu |
| `scripts/phase3/fetch-lyrics.ts` | RM → LRCLIB, uloží do `.data/lyrics/` |
| `scripts/phase3/generate-analysis.ts` | Ollama Cloud, paralelně 6× |
| `scripts/phase3/write-content.ts` | zapíše MDX / extraMeta |
| `scripts/phase3/quality-gate.ts` | kvalitativní filtr (§5) |
| `scripts/phase3/run-batch.ts` | orchestrátor celého cyklu |

---

## 5. Kvalitativní filtr — kdy sundat noindex

Tohle je **nejdůležitější bezpečnostní prvek**. `noindex` se sundá jen když:

- ✅ Obsah má **≥ 400 znaků** napříč sekcemi
- ✅ Alespoň 3 z 5 sekcí je vyplněno (about/context/production/interpretation/impact)
- ✅ Žádná sekce není delší než 40 % celku (nedominuje jedna fráze)
- ✅ **Hedge ratio < 30 %** — poměr slov „pravděpodobně / možná / nelze / neznámý / patrně"
- ✅ Neobsahuje zakázané fráze: „nelze určit", „nejsou dostupné informace", „bohužel"
- ✅ Projde deduplikací — stejný text nesmí být na 2+ skladbách (odhalí template fallback)

Když skladba filtrem neprojde → **zůstává `noindex`**, ale obsah se zapíše.
Druhý pokus s lepším promptem je možný později.

---

## 6. Fáze po pásmech

| # | Pás | Skladeb | Odhad | Dávek |
|---|---|---|---|---|
| **3.1** | A — RM bohaté | 377 | ~2 h | 4 |
| **3.2** | B — texty + vlastní AI | ~2 200 | ~6 h | 22 |
| **3.3** | C — holá metadata | ~1 900 | ~3 h | 19 |

**3.1 jde první** — nejmenší, nejkvalitnější, ověří celý pipeline na datech,
kde víme, jak má výsledek vypadat. Teprve pak škálujeme na 3.2.

---

## 7. Bezpečnost

- **Před každou dávkou:** git commit (rollback = `git reset --hard`)
- **Nikdy nemazat** existující obsah — jen doplňovat
- **`noindex` se sundá jen po ověření** kvalitativním filtrem
- **Rate limit:** 6 paralelních volání (testováno OK), 200 ms pauza mezi batchemi
- **Klíč:** `~/projects/crisis-management/.env.local` → `OLLAMA_API_KEY` (nikdy do gitu)
- **Build:** až po celém pásu, ne po každé dávce (~40 min)

---

## 8. Metriky úspěchu

| Metrika | Start | Cíl 3.1 | Cíl 3.2 | Cíl 3.3 |
|---|---|---|---|---|
| Skladby s obsahem > 400 znaků | 5 | 377 | ~2 500 | ~2 500 |
| Skladby bez `noindex` | 236 | ~600 | ~3 000 | ~3 000 |
| Sitemap URL | 252 | ~600 | ~3 000 | ~3 000 |
| Hedge ratio (průměr) | — | < 20 % | < 30 % | n/a |

---

## 9. Co NEDĚLÁME

- ❌ Nekopírujeme RM analýzy 1:1 (autorská práva) — přebíráme strukturu a fakta,
  formulace jsou naše
- ❌ Nefabulujeme fakta (producent, datum, host) — když nevíme, napíšeme obecně
- ❌ Neděláme všech 4 046 najednou — po dávkách, s kontrolou
- ❌ Nenecháme `noindex` na stránkách s reálným obsahem (zbytečně ztrácíme traffic)
