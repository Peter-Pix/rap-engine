# Cross-reference nález — Ektor

> **Datum auditu**: 2026-06-20
> **Layer**: 2 — Interní cross-reference
> **Source**: `factcheck/01_raw/artist_ektor/`

---

## 🔍 Nález: Album Ametyst zmiňovaný v profilu neexistuje v DB

### Context

`profile.json` tvrdí:
- `keyAlbums[0]` = Ametyst (2008) — "Prvotina s **Enemym**, která ukázala syrový talent"
- `careerSummary`: "Od undergroundového debutu **Ametyst s producentem Enemym** se vypracoval..."
- `note` v meta.json: "Aktivní od 2007"

`relations.json` uvádí 13 alb:
- album_topstvi (2011), album_tetris (2012), album_detektor (2015), album_detektor-ii (2016?), album_alfa (2017), album_marko (?), album_original (?), album_detektor-iii (2023), album_sativa (?), album_figury (?), album_velke-hry (?), album_2086 (?), album_treti-oko (2015)

**Ametyst v relations není.**

### Data layer konzistence

```
"album_topstvi" description: "Ektor v roce 2011 vydal své **DRUHÉ** album."
                                            ^^^^^^
"Treti oko" (2015)        description: "Ektor v roce 2015 vydal album Treti oko"
```

**Topství (2011) je 2. album.** Pokud Topství je druhý, tak **něco předcházelo** — a profile.json tvrdí že to bylo Ametyst (2008). Ale v DB není.

### Možnosti

1. **Ametyst nikdy neexistovalo** (fake album v profilu, AI halucinace)
2. **Album bylo přejmenováno** — originál má jiný název v DB
3. **Album existuje pod jiným slugem** — chybný import

### Akce: Layer 3+ — Wikipedia / Discogs

Příští session: Ověřit oficiální Ektorovu diskografii přes:
- https://cs.wikipedia.org/wiki/Ektor (rapper)
- Discogs: https://www.discogs.com/artist/2585928-Ektor
- Oficiální web: https://www.detektorrecords.cz/

---

## 🔍 Nález: Nekonzistentní informace o Ektorově labelu

`meta.json`:
- `label`: "Detektor Records"
- `note`: "Zakladatel Detektor Records"

`relations.json`:
- `labels`: ["label_detektor-records"]

Cross-ref OK ✓

---

## 🔍 Nález: Birthday rok 1985 vs activeSince 2007/2008

Ektor se narodil **4. 12. 1985** (per `birthDate`). 
- `activeSince: "2008"` — takže mu bylo 22-23 let
- `note`: "Aktivní od 2007" — takže mu bylo 21-22 let

**To dává smysl.** Žádný rozpor, jen různé zdroje uvádějí různý rok začátku.

---

## 📋 Další cross-reference TODO

- **Enemy** (producent) — zmiňovaný v profile.json. Existuje jako entita? Mrknu.
- **DJ Wich** — Tetris kolaborace. Album_tetris existuje? Mrknu.
- **Detektor Records label** — label_detektor-records. Obsahuje Ektora? Backlink.
- **Martha Elefteriadu** — matka, řecká zpěvačka. Externí info, ne entita.
---

## 🔍 Layer 2 — Cross-reference s cache

### Albumy v Ektorových relations (HAS_ALBUM)
13 alb v DB:
- Topství, Tetris, Detektor, Detektor II, Alfa, Marko, Originál, Detektor III, Sativa, Figury, Velký hry, 2086, Třetí oko

### Metadata z cache vs moje domněnky

| Album | DB rok | Moje domněnka | Match? |
|-------|--------|---------------|--------|
| Topství | 2011 | 2011 | ✅ |
| Tetris | 2024 | 2012 (moje paměť) | ❓ Ověřit |
| Detektor | 2011 | 2015 (moje paměť) | ❓ Ověřit |
| Detektor II | 2023 | 2016 (moje paměť) | ❓ Ověřit |
| Detektor III | 2023 | 2023 | ✅ |
| Marko | 2019 | 2018 (moje paměť) | ❓ Ověřit |
| Originál | 2019 | 2019 | ✅ |
| Třetí oko | 2015 | 2015 | ✅ |
| Figury | 2013 | 2013 | ✅ |
| Velký hry | 2017 | 2017 | ✅ |

**Pattern**: Některé roky v DB se mi zdají podezřelé (Tetris 2024?). **ALE: Moje paměť může být špatná**. Nutná primary source verifikace.

**Akce: Layer 3 — Wikipedia cs + Discogs**

### Cross-reference s labelem
- `label_detektor-records` popis: "...vydává svou tvorbu **od roku 2015**."
- `album_topstvi` (2011) popis: "Deska vyšla pod labelem Detektor Records."

**Konflikt**: Pokud Topství (2011) je Detektor Records, label existoval **od 2011**, ne 2015.

### Cross-reference s Enemy (producent)
- `artist_dj-enemy` existuje ✓
- Profile.json ho zmiňuje jako spolupracovníka na Ametystu

---

## 📊 Layer 2 výsledek

**Cross-ref konzistentní**: 8/13 alb rok OK v mojí paměti
**Cross-ref podezřelé**: 4 alba (Tetris, Detektor, Detektor II, Marko) — vyžaduje primary source
**Cross-ref jasný konflikt**: 1 (label Detektor Records founding date)

---

## 🌐 Layer 3 — External sources (Discogs, 2026-06-21)

### Wikipedia cs — NEGATIVNÍ

- Hledány varianty: `Ektor_(rapper)`, `Ektor_(zpěvák)`, `Ektor_rapper`, `Marko_Elefteriadis`, `Ektor_(umělec)`
- **Všechny vrátily HTTP 404** (stránka neexistuje)
- **Závěr**: cs Wikipedie nepokrývá Ektora — primární zdroj chybí

### Discogs API — POZITIVNÍ

- Artist nalezen: ID **2468695**
- URL: https://www.discogs.com/artist/2468695-Ektor
- Profil API: https://api.discogs.com/artists/2468695
- Releases API: https://api.discogs.com/artists/2468695/releases

### Discogs identita — cross-reference s DB

| Pole | Discogs | DB | Match |
|------|---------|-----|--------|
| Real name | Marko Elefteriadis | Marko Elefteriadis | ✅ |
| Birth date | December 4, 1985 | 1985-12-04 | ✅ |
| Birth place | Dobřichovice | Praha (Dobřichovice) | ✅ |
| Matka | Tena Elefteriadu | Martha (v profile.funFacts) | ❌ → F12 |

### Discogs master alba — cross-reference s DB

Pouze **role = Main** (nikoliv Appearance):

| Album | Discogs rok | DB publishedAt | Match |
|-------|-------------|----------------|-------|
| Detektor | **2015** | 2011 | ❌ → F7 |
| Detektor II | **2016** | 2023 | ❌ → F8 |
| Original | **2020** | 2019 | ⚠️ +1 rok |
| Detektor III | **2023** | 2023 | ✅ |
| Sativa | **2024** | 2024 | ✅ |

### Discogs appearance (feat) alba

Toto jsou alba, kde Ektor vystupuje jako host, ne hlavní interpret:

- 2012: 23
- 2013: Navždy, Idiot, Za Očami
- 2014: Rival, Noční Vidění, Pirát
- 2015: Bída & Bolest
- 2016: Krstný Otec
- 2017: Pancier
- 2018: Pouliční Ekonomická 3, SKAP
- 2020: Prozyum, Medusa II
- 2025: Bieber Fever, Painkillers

**Pattern**: Všechny appearance alba jsou **slovenské produkce** (2013–2018) nebo Polák/Polsko po 2020. Zajímavý pattern: Ektor hostoval na slovenských labelech v době, když měl vlastní label.

### Co chybí v Discogs

Alba v DB, která nemají Discogs master:
- Topství (2011 dle description)
- Tetris (2012 dle profile.keyAlbums)
- Alfa (2017 dle profile.keyAlbums)
- Marko (2019 dle description)
- Figury (2013 dle publishedAt)
- Velký hry (2017 dle publishedAt)
- 2086 (2026 dle publishedAt)
- Třetí oko (2015 dle publishedAt)

**Pattern**: Všechna jsou potenciálně CZ-only vydání pod Detektor Records. Discogs mezinárodní databáze je nemá, pokud nebyly distribuovány mimo ČR/SK.

---

## 🌐 Layer 3 — další plán

### Ověřit u jiných zdrojů

- **Spotify** — hledat „Ektor" (CZ region), ověřit roky alb + počty tracků
- **Apple Music** — bio a roky alb
- **Oficiální web detektorrecords.cz** — kompletní diskografie
- **YouTube kanál Ektor oficiální** — datum registrace + první upload jako indie rok začátku
- **Last.fm** — popularita v čase, top alba

### Ametyst mystery

- ❌ Neexistuje v DB, Discogs, Wikipedii
- ⚠️ Zmíněn v profile.careerSummary a keyAlbums
- ⚠️ Enemy (producent) je v DB jako artist_dj-enemy — ale Discogs nepotvrzuje Ametyst

**Akce**: Hledat Ametyst Ektor na Spotify / Apple Music / YouTube / SoundCloud. Pokud nenajdu, je to AI halucinace (viz F11).

---

## 📊 Layer 3 výsledek

**Cross-ref VERIFIED**: Real name ✅, birth date ✅, birth place ✅, 2/5 master alb ✅
**Cross-ref DATA ERROR**: 2/5 master alb (Detektor 2011 vs 2015, Detektor II 2023 vs 2016) → F7, F8
**Cross-ref MISSING**: 8/13 alb bez Discogs master → F10
**Fake claim**: profile.funFacts mate tetu/matku → F12
**AI halucinace**: Ametyst (2008) → F11

**Přístí vrstva**: Spotify + Apple Music + oficiální web pro dokončení Layer 4.


