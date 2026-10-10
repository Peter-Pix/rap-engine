# Common Ground v2 — plán rozšíření databáze o spolupráce

> **Datum:** 10. 10. 2026
> **Cíl:** „Kdo má s kým jaký společný track" — hlavní lákadlo platformy.
> **Stav:** analýza hotová, čeká se na schválení

---

## 1. Diagnóza — proč to teď nefunguje

### Ověřená čísla

| Metrika | Hodnota | Poznámka |
|---|---|---|
| Skladeb v DB | **427** | entita `track` |
| Skladeb s `primaryArtist` | 427 (100 %) | ✅ funguje |
| Skladeb s `producers` | 98 (23 %) | ⚠️ částečné |
| **Skladeb s `featuring`** | **5 (1,2 %)** | 🔴 **jádro problému** |
| FEATURES hran v grafu | 8 | |
| Umělců v DB | 283 | |
| Žánrů / stylů / témat | 125 / 24 / 35 | |

**Příklad selhání:** Yzomandias × Nik Tendo → 0 společných skladeb.
Realita: oba hostují na „Až na měsíc" (Viktor Sheen, 2019) — `relations.json`
toho tracku **obsahuje** `"featuring": ["artist_calin","artist_hasan","artist_nik-tendo"]`.
Data jednoho tracku existují, ale **v celé DB je takových jen 5**.

### Root cause

Není to bug v kódu. Pipeline funguje správně (8 feat. vazeb se zpracovalo).
**Chybí data.** U 422 ze 427 skladeb nikdo nevyplnil `featuring` v `relations.json`.

### Kde jsou data k dispozici (ověřeno živě)

| Zdroj | Skladeb | s feat. | Poznámka |
|---|---|---|---|
| **Naše DB (entity `track`)** | 427 | 5 | |
| **Deezer tracklisty (už na disku!)** | **6 068** | **411 skladeb / 521 vazeb** | v `content/entities/album_*/tracks.json` (529 alb) |
| **Rap Monitor API** | 3 090 | 20 (`featuring_names`) + **260 v titulu** | 414/427 našich skladeb matchuje (97 %) |
| Rap Monitor – lyrics | — | 546 | |
| Rap Monitor – producer | — | 185 | |

### 🔥 Zásadní nález: Deezer tracklisty leží ladem

V repu je **529 alb s `tracks.json`** (Deezer tracklisty) = **6 068 skladeb**
s polem `feat[]` (521 vazeb). To je **80× víc feat. dat než v entitách** — a
**nikdy se nepropsaly do grafu**.

- 247 feat. jmen matchuje existující RKG artisty → okamžitě použitelné
- 204 nematchuje (zahraniční / outside-scope / chybějící entity)

**Tohle je nejrychlejší cesta k funkčnímu „společné skladby".**

**Klíčový trik:** feat. hosté jsou často **přímo v titulu** — `"4 (feat. Lvcas Dope)"`,
`"Budoucnost (feat. Rest, Separ)"`. Parser v titulu najde **260 skladeb** u RM
oproti 20 ve strukturovaném poli → **13× víc pokrytí**.

---

## 2. Strategie — tři vrstvy obohacení

```
Vrstva A: PARSOVÁNÍ FEAT Z TITULŮ        (nejrychlejší win, 2–3 h)
Vrstva B: RAP MONITOR IMPORT             (masivní rozšíření, 4–6 h)
Vrstva C: DEEZER ENRICHMENT              (dotažení metadat, 3–4 h)
```

### Vrstva A — Parser feat. z titulů (2–3 h)

**Co:** Skript projde všech 427 track `meta.json` + 3 090 RM skladeb, vytáhne
feat. hosty z titulu regexem, matchnе na RKG artisty, doplní `relations.featuring`.

**Reuse:** `scripts/deezer/enrich-album.ts` už má hotový regex:
```ts
/\s*\((?:feat\.?|ft\.?|featuring)\s+([^)]+)\)/gi
/\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/gi
```

**Nové pokrytí (odhad):** 5 → **~200 skladeb** s feat. vazbou.

**Rizika:**
- Vícenásobní hosté („Rest, Separ") → rozseknout na `,` / `&` / `x`
- Zahraniční hosté („DZK, Cryptic Wisdom") → **scope rule: zahraniční = zahodit**
  (nebo uložit jako `artist_external_*` stub? — viz rozhodnutí D2)
- Falešné pozitivy („ft." v názvu kapely) → whitelist match proti RKG

### Vrstva B — Rap Monitor import (4–6 h)

**Co:** Doplnit z RM API (`/api/entities/Song`, 3 090 záznamů):
- `featuring_names` / `featuring_artist_ids` (20 skladeb)
- `lyrics_text` (546) → nové pole `lyrics`, obrovská SEO hodnota
- `producer` / `beatmaker` (185) → doplnit `PRODUCED_BY`
- `ai_summary_short` / `ai_emotions` / `tags_genre|style|mood` → auto-tagging
- `spotify_url` / `youtube_url` / `apple_music_url` → externí odkazy
- `isrc`, `duration`, `release_date`

**Reuse:** `scripts/import-rap-monitor-tracks.ts` **už existuje a umí to**
(matchuje titul + artist, merge s `MIN_CONFIDENCE`).

**Otázka:** Chceme rozšířit DB o **2 663 nových skladeb** (3 090 − 427)?
→ To by znamenalo **7× víc skladeb** = obrovský SEO a discovery win.
→ Ale: kvalita dat z RM je nehomogenní (`metadata_confidence` kolísá, 80 vs 100).

### Vrstva C — Deezer enrichment (3–4 h)

**Co:** Dotáhnout tracklisty alb (`tracklist.json` → `tracks.json`), feat. hosty
z Deezer API. Skripty existují: `bulk-enrich.ts`, `feat-enhance.ts`, `build-index.ts`.

**Stav:** `.deezer/` cache existuje? Nutno ověřit, kolik alb je matchnuto.

---

## 3. Dopad na Common Ground

### Nové sekce na `/porovnat`

```
1. Společné skladby        ← NOVÉ (hlavní lákadlo)
   └ "Až na měsíc" — Viktor Sheen, 2019 (oba hosté)
   └ "Krejčí" — Calin, 2023 (Nik Tendo feat)
2. Společné žánry/styly/nálady
3. Společné labely
4. Společné lokality
5. Kdo s kým spolupracoval ← NOVÉ (feat. síť)
   └ "oba hostovali u X" / "X hostuje u obou"
```

### Datový model — nová relace

Už **existuje**: `FEATURES` (track → featured artist), `HAS_ARTIST` (track → primary).
Pro Common Ground „společná skladba" stačí **průnik**:
```
spolecneSkladby(A,B) = { t : t HAS_ARTIST/FEATURES A } ∩ { t : t HAS_ARTIST/FEATURES B }
```
→ Žádná nová relace není potřeba. Jen **naplnit data**.

### Bonus: „stupeň propojení"

Druhá úroveň atraktivity: **nepřímé propojení** (BFS přes RELATED_TO / FEATURES).
„Yzomandias a X spolu nikdy nenahráli, ale oba hostovali u Viktora Sheena."
→ `shortestPath(A, B)` v grafu. Graf už je postavený (9 309 hran).

---

## 4. Architektura zpracování

```
┌─ ZDROJE ─────────────────────────────┐
│ Rap Monitor API (3090 songs)         │
│ Deezer API (tracklisty)              │
│ Tituly (feat. parser)                │
└──────────────┬───────────────────────┘
               ▼
┌─ NORMALIZACE ────────────────────────┐
│ normalize(name) → slug match na RKG  │
│ scope filter (CZ/SK only)            │
│ confidence threshold (metadata_*)    │
└──────────────┬───────────────────────┘
               ▼
┌─ ZÁPIS ──────────────────────────────┐
│ content/entities/track_*/relations.json │
│   .featuring[]  (append-only)         │
└──────────────┬───────────────────────┘
               ▼
┌─ CACHE ──────────────────────────────┐
│ npm run cache:build → FEATURES edges  │
└──────────────┬───────────────────────┘
               ▼
┌─ UI ─────────────────────────────────┐
│ /porovnat → "Společné skladby"        │
└───────────────────────────────────────┘
```

**Bezpečnost:** append-only, idempotentní, záloha do `.backups/` (vzor `feat-enhance.ts`).
**Neverifikované:** každá nová vazba dostane `source` + `confidence` do `extraMeta`.

---

## 5. Fáze realizace

| # | Fáze | Obsah | Odhad |
|---|---|---|---|
| **0** | **Feat. z Deezer tracklistů** | Propojit 529 `tracks.json` → `relations.featuring` (247 matchů) | **2–3 h** |
| **1** | Feat. parser titulů | Doplnit feat z titulů (RM + naše) přes regex | 2–3 h |
| **2** | **Common Ground v2** | „Společné skladby" sekce v `/porovnat` | **2–3 h** |
| **3** | RM import | Doplnit feat./producer/lyrics z RM | 4–6 h |
| **4** | Rozšíření DB | Import nových skladeb (Deezer + RM) | 4–6 h |
| **5** | Nepřímé propojení | BFS „spojuje je X" | 3–4 h |

**Celkem:** ~17–25 h. Doporučené pořadí: **0 → 2 → 1 → 3 → 4 → 5**
(fáze 0 + 2 dá funkční „společné skladby" za jeden večer, ~5 h).

---

## 6. K rozhodnutí

- **D1 — Rozšířit DB na ~3 000 skladeb?** (7× víc, ale kvalita RM kolísá)
  → Návrh: **ano, ale s `confidence` flagem** a možností skrýt low-confidence.
- **D2 — Zahraniční hosté?** → Návrh: scope rule CZ/SK, zahraniční uložit jako
  `artist_external_<slug>` stub (nezobrazovat v hlavních seznamech, jen v track detailu).
- **D3 — Lyrics na webu?** → Právně citlivé (autorská práva). Návrh:
  **neukládat plný text**, jen metadata + odkaz na zdroj. Nebo AI summary.
- **D4 — „Společné skladby" jako hlavní sekce?** → Návrh: **ano, první nahoře**
  v `/porovnat`, před žánry.

---

## 7. Rychlý win (doporučení)

**Fáze 0 + 2** dá funkční „společné skladby" během jednoho večera (~5 h):
- Fáze 0: propojí 529 existujících Deezer tracklistů (247 feat. matchů) do grafu
- Fáze 2: přidá sekci „Společné skladby" do `/porovnat`

Žádné nové API volání, žádný import — **data už leží na disku**, jen se nepoužívají.

Pak se uvidí, jestli má smysl tahat 3 000 skladeb z RM.
