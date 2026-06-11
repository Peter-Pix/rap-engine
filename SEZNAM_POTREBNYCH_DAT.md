# 2026-06-11 Seznam nejpotřebnějších dat

## Současný stav

- **Entity celkem:** 780 (702 graph-folder + 78 legacy)
- **Vztahy (edges):** 1985
- **Stránky:** 785 SSG
- **Validace:** 0 chyb, 302 varování

---

## Priorita 1: Migrovat 78 legacy entit → graph-folder

**Příkaz:** `npx tsx scripts/migrate-legacy-to-entities.ts`

| Zdroj | Počet | Cílový typ | Poznámka |
|-------|-------|------------|----------|
| `content/raperi/` | 43 | `artist_*` | 32 překrývá ref. project (skip) |
| `content/zanry/` | 9 | `genre_*` | Všechny překrývají (skip) |
| `content/styles/` | 7 | `style_*` | Žádný konflikt |
| `content/moods/` | 6 | `mood_*` | Žádný konflikt |
| `content/themes/` | 12 | `theme_*` | Žádný konflikt |
| `content/scenes/` | 3 | `scene_*` | Žádný konflikt |

**Efekt:** Legacy loader se stane zbytečným. Cache se zrychlí. Zbývající varování klesnou z ~302 na ~200.

---

## Priorita 2: Dovozit 28 chybějících artistů (zbylých z ref. project)

**Zdroj:** `Project_1/rap-engine-second-trial/content/raperi/*.mdx`
**Metoda:** `npx tsx scripts/import-reference-data.ts --phase=artists`
**Předpoklad:** Nejprve musíme migrovat legacy, jinak budou 32 artistů stále skipnutých.

| # | Artist | Refs | Kdo ho zmiňuje |
|---|--------|------|----------------|
| 1 | **lucas-blakk** | 4 | dj-aka, fosco-alma, jay-diesel, marcus ... |
| 2 | **pauli-garand** | 3 | adiss, lipo, label_bpm |
| 3 | **meizmen** | 3 | eris, marger, zuris |
| 4 | **peter-pann** | 3 | eusebio, miky-mora, neries |
| 5 | **porsche-boy** | 2 | astralkid22, dokkeytino |
| 6 | **indyz** | 2 | dj-wich, mike-trafik |
| 7 | **marko-damian** | 2 | g1nter, katannah |
| 8 | **grimaso** | 2 | irit, sakito |
| 9 | **kenny-rough** | 2 | lipo, bpm |
| 10 | **smack-one** | 2 | marger, producer_voodoo808 |
| 11 | **hajtkovic** | 2 | luza, nazov-stavby |
| 12 | **slipo** | 2 | luza, nazov-stavby |
| 13-30 | (dalších 18) | 1x | každý jen 1 reference |

**Poznámka k slugs:** `peter-pann`, `grimaso` už existují s hranatými závorkami (`[peter-pann]`, `[grimaso]`) — importované z ref. project jako neočekávaný slug formát. Nutné sanitizovat při importu.

---

## Priorita 3: Vytvořit 26 chybějících žánrů

**Zdroj:** Ref. project `content/zanry/*.mdx` (nebo ručně)

| # | Žánr | Refs | Typické použití |
|---|------|------|-----------------|
| 1 | **electronic** | 4 | artist_dj-aka, artist_eris... |
| 2 | **neo-soul** | 3 | album_i, album_ii, artist_7krat3 |
| 3 | **r-n-b** | 3 | artist_dj-wich, artist_nero, artist_fosco-alma |
| 4 | **nu-metal** | 3 | artist_dj-aka, artist_eris, artist_jay-diesel |
| 5 | **world** | 2 | artist_bobby-blaze |
| 6 | **new-wave** | 2 | artist_eris, artist_fosco-alma |
| 7 | **social-commentary** | 2 | artist_indyz, artist_miklos |
| 8 | **garage-punk** | 2 | artist_eris, artist_marko-damian |
| 9 | **political-punk** | 2 | artist_eris, artist_jay-diesel |
| 10 | **pluggnb** | 1 | ... |
| 11-26 | (dalších 16) | 1x | každý jen 1 reference |

**Efekt:** Žánrová síť začne fungovat lépe. `getSimilarArtists` bude mít víc dimenzí pro srovnání.

---

## Priorita 4: Importovat 32 chybějících alb

**Zdroj:** Ref. project `content/alba/*.mdx`
**Metoda:** `npx tsx scripts/import-reference-data.ts --phase=albums --skip-existing`

Většina má jen 1x ref, ale některá jsou významná:
- **mamuti-lp** — odkazuje z `content/raperi/billy-bust.mdx` (bustova deska)
- **aux** — odkazuje z `content/raperi/billy-bust.mdx`
- **teenrage** — odkazuje z `content/raperi/billy-bust.mdx`

**Poznámka:** Album import už funguje (453 alba vytvořených). Chybějící alba jsou pravděpodobně ta, jejichž `rapperSlug` neexistuje v našem systému (nebo je label, ne artist).

---

## Priorita 5: Vytvořit chybějící label

| Label | Refs | Zdroj |
|-------|------|-------|
| **l.u.z.a.** | 1 | nazov-stavby (label) |

Nízká priorita — jen 1 reference.

---

## Priorita 6: Opravit sanitizaci slugů

**Problém:** Import z ref. project vytvořil entity s nevalidními ID:
- `artist_[peter-pann]` — hranaté závorky v ID
- `artist_[grimaso]` — hranaté závorky v ID
- `artist_[peter-pann,-cistychov]` — čárka v ID
- `artist_[peter-pann,-kali]` — čárka v ID
- `artist_[peter-pann,-mairee]` — čárka v ID
- `artist_[peter-pann,-veronikas]` — čárka v ID

**Řešení:** Přidat agresivnější sanitizaci do `sanitiseId()` v `paths.ts`: odebrat `[](),.` a nahradit čárky.

---

## Souhrn efektů

| Krok | Entity + | Dangling ↓ | Warnings ↓ |
|------|----------|------------|------------|
| 1. Migrace legacy | +0 (jen přesun) | -0 | -80 |
| 2. Dovoz 28 artistů | +~28 | -109 | -109 |
| 3. Dovoz 26 žánrů | +~26 | -39 | -39 |
| 4. Dovoz 32 alb | +~32 | -32 | -32 |
| 5. Label l.u.z.a. | +1 | -1 | -1 |
| 6. Sanitizace slugů | 0 (refaktoring) | -0 | -fix |
| **Celkem** | **~+87** | **-181 → ~0** | **-302 → ~40** |

Po všech krocích: ~870 entit, ~40 warnings (většinou empty descriptions), čistý graph bez dangling edges.
