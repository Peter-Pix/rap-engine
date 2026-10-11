# Plán: Chytré škálování obsahu — žádné prázdné stránky

**Datum:** 2026-10-11
**Zásada:** Žádná prázdná stránka, žádný prázdný stav, žádná entita bez hodnoty.

---

## 1. Diagnóza (ověřeno na datech)

### Stav obsahu podle typu
| Entita | Počet | Prázdné (<200B) | Tenké | Bohaté | Backlinky |
|--------|-------|-----------------|-------|--------|-----------|
| track | 4 490 | 2 011 (stuby, noindex OK) | 226 | **2 253** | — |
| album | 604 | 13 | **587** ⚠️ | 4 | — |
| artist | 283 | **112** ⚠️ | 34 | 137 | — |
| genre | 125 | 46 | 45 | 34 | 3 525 |
| label | 94 | 57 ⚠️ | 27 | 10 | — |
| location | 42 | 25 | 3 | 14 | — |
| **theme** | 35 | **35 (100 %)** 🔴 | 0 | 0 | 1 361 (Ø 39) |
| **mood** | 22 | **22 (100 %)** 🔴 | 0 | 0 | 1 429 (Ø 65) |
| **style** | 24 | **24 (100 %)** 🔴 | 0 | 0 | 610 (Ø 25) |
| **scene** | 5 | **5 (100 %)** 🔴 | 0 | 0 | 116 (Ø 23) |
| article | 17 | 0 | 0 | 17 ✅ | — |
| producer | 16 | 7 | 2 | 2 | — |
| collective | 8 | 7 | 0 | 1 | — |

### Klíčová zjištění

**A) Taxonomie jsou prázdné, ale MOCNĚ navštěvované.**
- `theme`/`mood`/`style`/`scene` = **86 entit, 100 % prázdných**
- Ale mají **3 516 backlinků** dohromady
- Top díry: `style/melodic` (289 refs), `mood/emotional` (241), `mood/dark` (218),
  `theme/life` (217), `theme/flex` (215), `mood/confident` (206)
- **Obsah, který vidí tisíce návštěvníků, je formule „X — theme v rámci české
  a slovenské rapové scény."**

**B) Data pro obsah EXISTUJÍ, ale nejsou využitá.**
- **1 826 tracků** má `extraMeta.themes` → 9 914 odkazů (7 417 unikátních)
- **1 826 tracků** má `extraMeta.moods` → 7 040 odkazů (932 unikátních)
- Ale: naše theme entity matchují jen **450 z 9 914** odkazů → 95 % nevyužito
- Důvod: RM volný text (`"láska a túžba"`) vs naše anglické entity (`Flex`, `Life`)

**C) Anglické názvy taxonomií.**
- `Art`, `Beef`, `Death`, `Flex`, `Life`, `Mood Abstract` — nedrží českou konvenci webu
- Mix: `Agresivní`, `Klidná` (česky) vedle `Dark`, `Chill` (anglicky)

**D) `/temata/life` zobrazuje ALBA, ne skladby.**
- 217 backlinků = seznam alb bez kontextu
- Chybí: co téma znamená, jak se projevuje v rapu, typické skladby

**E) Alba jsou 587× tenká.**
- 604 alb, jen 4 bohatá. Většina má jen tracklist bez popisu.

---

## 2. Priority (podle dopadu na uživatele)

### P1 — Taxonomie (86 entit, 3 516 backlinků) 🔴 NEJVYŠŠÍ
**Proč:** Nejnavštěvovanější prázdné stránky. 86 entit × hodnotný obsah = obrovský dopad.

**Jak:**
1. **České názvy** — `Flex` → `Flexování`, `Life` → `Život`, `Art` → `Umění`
   (zvážit: keep EN slug pro SEO, CZ title pro uživatele)
2. **Obsah z dat** — pro každou entitu:
   - Co téma/nálada znamená (definice)
   - Jak se projevuje v CZ/SK rapu (kontext)
   - **Top skladby** které ho nesou (z reálných hran!)
   - Nejčastější interpreti
3. **Zobrazit SKLADBY, ne jen alba** — tracky jsou to, co uživatele zajímá

**Odhad:** 86 entit × ~30 s generování = ~45 min (6 paralelně)

### P2 — Propojení RM themes → naše entity (95 % nevyužitých dat)
**Proč:** 9 914 odkazů leží ladem. Když je namapujeme, každá entita dostane
desítky reálných skladeb.

**Jak:**
- Normalizační vrstva: RM volný text → naše kanonické téma
- Alias mapa (`"láska a túžba"`, `"oslava lásky"` → `relationships`)
- Fuzzy + ruční kurátorství top 100 výrazů

### P3 — Alba (587 tenkých)
**Proč:** 604 alb, většina bez popisu. Ale mají tracklist = základ pro obsah.
**Jak:** Popis z tracklistu + interpretů + žánrů (deterministicky, ne AI halucinace).

### P4 — Artisté (112 prázdných)
**Proč:** 112 rapperů bez profilu. Ale ne všichni mají dost dat.
**Jak:** Jen ti, kteří mají ≥3 skladby NEBO ≥2 alba. Zbytek → noindex.

### P5 — Label/location/collective/producer (96 prázdných)
**Priorita nízká** — málo backlinků. Ale snadný výher: kdo na labelu vydává, kdo odsud je.

---

## 3. Principy (aby to nebylo prázdné)

1. **Obsah musí vznikat z DAT, ne z hlavy.** Top skladby, interpreti, počty —
   vše deterministicky z grafu.
2. **Nikdy nezobrazit entitu bez hodnoty.** Pokud nemá obsah ani vazby → noindex,
   ne prázdná stránka.
3. **Skladby > alba.** Uživatel chce vědět „které tracky", ne „která alba".
4. **Kvalitativní filtr** jako u Pásu A: ≥400 znaků, hedge <30 %, žádné formule.
5. **Žádné „stub. Bude doplněno později."** Buď obsah, nebo noindex.

## 4. Anti-patterny (co NEDĚLAT)

- ❌ Generovat obsah pro entitu, která nemá backlinky ani data (= prázdná stránka)
- ❌ Kopírovat RM text 1:1 (autorská práva)
- ❌ Vymýšlet si, co téma znamená, když nemáme data
- ❌ Anglické názvy bez české varianty
- ❌ Vypisovat 217 alb bez kontextu

## 5. Doporučený start

**P1 + P2 společně** — protože P2 dá P1 obsah:
1. Namapovat RM themes/moods → naše entity (P2) → každá entita dostane skladby
2. Vygenerovat obsah pro 86 taxonomií (P1) z těch dat
3. Ověřit na 5 entitách → pak zbytek
