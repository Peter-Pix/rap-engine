# Roadmapa rozšíření databáze 4rap.cz

> **Stav k 12. 10. 2026** — 5 790 entit · 34 917 hran · 2 040 autoritativních · 3 493 indexovatelných

---

## 0. KDE JSME (tvrdá čísla)

| Metrika | Hodnota | Interpretace |
|---|---|---|
| Entity | 5 790 | tracky dominují (4 509 = 78 %) |
| Hrany | 34 917 | ~6 hran/entita |
| Indexovatelné | 3 493 (60 %) | 2 040 autoritativní + 863 indexable |
| **Noindex/stub** | **2 040** | 2 229 tracků + zbytek — **největší nevyužitý potenciál** |
| Track bez žánru | 2 944 / 4 509 | 65 % |
| Track bez producenta | 4 366 / 4 509 | 97 % |
| Track bez alba | 433 | sirotci |
| Artist bez obrázku | 233 / 281 | 83 % |
| Artist bez popisu | 101 / 281 | 36 % |
| Alb bez labelu | 182 / 604 | 30 % |
| Alb bez tracklistu | 75 / 604 | 12 % |

---

## 1. ROOT CAUSE — proč je tolik noindex

**2 229 tracků je `noindex` + `isStub`** = nemají texty ani metadata → generický description `Skladba „X" od Y.`

**Klíčové zjištění z Fáze 4 (včera):** texty k nim **neexistují v žádné dostupné DB**:
- LRCLIB pokrytí CZ rapu ~5 % (testováno 20 stubů → 1 hit)
- RM má texty u 546 skladeb, ale 119 už je bohatých, zbytek nenamapováno
- Deezer tracklisty mají jen holá metadata (žádný text)

**→ Tohle NENÍ dluh, který se dá "dolít" jednoduchým scrapem.** Je to strukturální limit zdrojů.

---

## 2. STRATEGICKÉ ROZHODNUTÍ (před jakoukoliv další prací)

Existují **tři směry** různé hodnoty:

### Směr A — Prohloubit kvalitu EXISTUJÍCÍCH entit (indexovatelné)
Doplnit obrázky, popisy, žánry, producenty, labely tam, kde **už máme entitu s obsahem**.
- **Dopad:** zvedne SEO score + autoritativnost už indexovaných stránek
- **Cena:** střední (Discogs + ruční ověření)
- **Riziko:** nízké

### Směr B — Rozšířit POKRYTÍ (nové entity)
Přidat chybějící interprety/alba/skladby, které v DB vůbec nejsou.
- **Dopad:** víc stránek, víc long-tail SEO
- **Cena:** vysoká (nová data + ověření scope)
- **Riziko:** střední (scope guard, jako včera s RM name collisions)

### Směr C — Povýšit noindex stuby na indexovatelné
Nejambicióznější — potřebuje texty, které **neexistují**.
- **Dopad:** nejvyšší (2 229 stránek)
- **Cena:** nejvyšší (musí se najít/vybudovat zdroj textů)
- **Riziko:** nejvyšší (bez textů = halucinace, viz včerejší lekce)

---

## 3. KONKRÉTNÍ ROADMAPA (doporučené pořadí)

### 🟢 FÁZE 1 — Nízko visící ovoce (Směr A, ~3-4 h)

| # | Úkol | Rozsah | Zdroj | Hodnota |
|---|---|---|---|---|
| 1.1 | **Artist obrázky** — 233 bez obrázku | 233 | LastFM/Spotify/Deezer API | Vizuál + OG image |
| 1.2 | **Artist popisy** — 101 bez popisu (Prago Union 17 tracků, Jckpt 15, Irit 9…) | 101 | ručně + AI z tracků | SEO text |
| 1.3 | **Genre dedup** — old school × old school rap × old school cz | ~20 | audit | Čistota taxonomie |

### 🟡 FÁZE 2 — Strukturální doplnění (Směr A+B, ~6-8 h)

| # | Úkol | Rozsah | Zdroj | Hodnota |
|---|---|---|---|---|
| 2.1 | **Žánry tracků** — 2 944 bez žánru, dědit z alba | 2 944 | album.genres → track | Graf + SEO |
| 2.2 | **Labely alb** — 182 bez labelu | 182 | Discogs + RM | Graf |
| 2.3 | **Producenti** — 4 366 tracků, ale RM má jen 185 | ~200 | Discogs credits | Graf (nízká návratnost) |
| 2.4 | **75 alb bez tracklistu** | 75 | Deezer | Pokrytí |

### 🟠 FÁZE 3 — Nové entity (Směr B, ~10-15 h)

| # | Úkol | Rozsah | Zdroj | Hodnota |
|---|---|---|---|---|
| 3.1 | **Chybějící artisté** — RM má interprety, co v DB nejsou | TBD | RM + scope guard | Pokrytí |
| 3.2 | **Nová alba** — RM alba bez naší entity | TBD | RM + Deezer | Pokrytí |
| 3.3 | **Collectives/scenes** — rozšířit 8 kolektivů / 5 scén | TBD | ručně | Navigace |

### 🔴 FÁZE 4 — Stuby (Směr C, nejisté)

| # | Úkol | Rozsah | Zdroj | Hodnota |
|---|---|---|---|---|
| 4.1 | Najít zdroj textů (Musixmatch API? Genius CZ? vlastní transkripce?) | research | — | Odemyká 2 229 |
| 4.2 | Povýšit stuby s nalezenými texty | TBD | nový zdroj | Nejvyšší |

---

## 4. MOJE DOPORUČENÍ

**Začni Fází 1** (artist obrázky + popisy). Proč:
1. **Nejlepší poměr dopad/práce** — 233 obrázků + 101 popisů se dá udělat rychle, zlepší vizuál i SEO okamžitě.
2. **Žádné riziko** — jen doplňuješ existující entity.
3. **Artisté jsou páteř grafu** — 281 artistů generuje 4 510 HAS_ARTIST hran; jejich kvalita ovlivňuje všechno.

**Fáze 2.1 (žánry z alb) je nejlepší "quick win" pro graf** — 2 944 tracků bez žánru je největší datová mezera s jasným zdrojem (album.genres už existuje, jen se nedědí).

**Fázi 4 (stuby) nech být** — dokud nenajdeš zdroj textů. Včerejší halucinační chyba ukázala, že bez textů se AI uchýlí k výmyslu. Radši 2 229 poctivých stubů než 2 229 vymyšlených stránek.

---

## 5. OTÁZKY K ROZHODNUTÍ

1. **Fáze 1 (obrázky/popisy artistů)** — jdeme do toho?
2. **Žánry z alb (2.1)** — automaticky dědit `album.genres` na tracky, nebo jen pro tracky bez vlastního žánru?
3. **Stuby** — souhlasíš, že je necháme být, dokud není zdroj textů? Nebo chceš zkusit najít (Musixmatch/Genius)?
4. **Producenti (2.3)** — Discogs scraping má nízkou návratnost (97 % tracků bez producenta, ale RM jen 185). Stojí to za tu práci?

---

*Sepsáno z reálných dat (.content-cache/*, content/entities/*), ne z paměti.*
