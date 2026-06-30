# Data Průzkum — Co potřebuje obohatit

**Datum:** 2026-07-01  
**Celkem entit:** 1,237  
**Analýza:** Indexation Engine SEO scoring

---

## Priorita 1: Artisti bez obrázku (233 umělců)

Největší gap. 233 artistů nemá žádný obrázek. Top 20 podle SEO score:

| # | Umělec | Score |
|---|--------|-------|
| 1 | ADiss | 65 |
| 2 | Boy Wonder | 65 |
| 3 | CA$HANOVA BULHAR | 65 |
| 4 | DJ AKA | 65 |
| 5 | Dj Fatte | 65 |
| 6 | Dollar Prync | 65 |
| 7 | Grey256 | 65 |
| 8 | Haades | 65 |
| 9 | Hard Rico | 65 |
| 10 | Hasan | 65 |
| 11 | Hugo Toxxx | 65 |
| 12 | Koky | 65 |
| 13 | LA4 | 65 |
| 14 | Maniak | 65 |
| 15 | MC Gey | 65 |
| 16 | Michajlov | 65 |
| 17 | Nik Tendo | 65 |
| 18 | Paulie Garand | 65 |
| 19 | Radimo | 65 |
| 20 | Robin Zoot | 65 |

**Doporučení:** Batch import z Base44 nebo Deezer API.

---

## Priorita 2: Entity s prázdným popiskem (106 entit)

Umělci a alba bez popisu nebo s popiskem < 20 znaků. Top:

| Typ | Entita | Popis |
|-----|--------|-------|
| artist | Smack One | 16 chars |
| artist | Dj Opia | 14 chars |
| artist | Hellwana | 15 chars |
| artist | Strapo | 6 chars |
| artist | Supa | 6 chars |
| artist | David Beng Rostaš | 0 chars |
| artist | Chacharski | 0 chars |
| artist | Dušan Vlk | 0 chars |
| artist | Johny Machette | 0 chars |
| album | 20 000 míľ pod morom | 13 chars |
| album | Veni, Vidi, Wich | 13 chars |
| album | Dang | 10 chars |
| album | Panorama | 10 chars |

---

## Priorita 3: Draft entity s potenciálem (113 entit)

Nejvyšší potenciál — kandidáti na obohacení:

| # | Entita | Score | Typ |
|---|--------|-------|-----|
| 1 | Radikal Chef | 58 | artist |
| 2 | Nerieš | 37 | artist |
| 3 | Katarzia | 36 | artist |
| 4 | Dano Kapitán | 26 | artist |
| 5 | Berlin Manson | 25 | artist |
| 6 | Irit | 24 | artist |
| 7 | Matej Straka | 23 | artist |
| 8 | Jckpt | 21 | artist |
| 9 | Kup Kodein | 21 | artist |
| 10 | Decky | 20 | artist |

---

## Priorita 4: CANDIDATE → INDEXABLE (100 entit, score 35–39)

Těsně pod čárou — trochu popisu/obsahu = INDEXABLE:

| Typ | Entita | Score | Co chybí |
|-----|--------|-------|----------|
| album | ALIEN: Expansion Pack | 39 | nic |
| album | Láska Je Cool | 39 | nic |
| album | MANA | 39 | desc, content |
| album | Monology | 39 | nic |
| album | Si zabil | 39 | nic |
| album | Zabijem sa! | 39 | desc |
| genre | Experimental Hip Hop | 39 | content |
| location | Rychnov nad Kněžnou | 39 | img |
| album | Bauch Money Mixtape | 38 | img, content |
| album | before FUTUREPUNK | 38 | nic |

---

## Priorita 5: Alba bez coveru (29 alb)

| Album | Score |
|-------|-------|
| Ilegální kecy | 41 |
| Bauch Money Mixtape | 38 |
| Gyzmo | 36 |
| TMVCJN | 34 |
| Airon Meidan | 25 |
| Malý Pepek Mixtape Vol. 1 | 21 |
| Rok psa | 19 |
| Série remixů | 17 |
| DJ Wich v Kontře | 17 |
| Dlouhej příběh, krátkej svět | 16 |

---

## Priorita 6: Entity bez vazeb — osamocené (258 entit)

258 entit nemá žádné outbound relations. Příklady:

| Typ | Entita |
|-----|--------|
| album | Mamuti Lp |
| artist | 7krt3 |
| artist | Abde |
| artist | Abe Beats |
| artist | Adam Mik |
| artist | Akhles |
| artist | Avio |
| artist | Bacile |
| artist | Batrs |
| artist | Beatz |

**Proč:** Většina jsou draft/stub entity bez relations nebo alba bez přiřazených artistů.

---

## Priorita 7: Nejvíc propojené entity (hub nodes)

Top 20 — největší vliv na graf:

| # | Entita | Backlinks | Typ |
|---|--------|-----------|-----|
| 1 | Trap | 180 | genre |
| 2 | Rap | 123 | genre |
| 3 | Dark | 105 | mood |
| 4 | Milion+ | 93 | label |
| 5 | Life | 91 | theme |
| 6 | Bigg Boss | 85 | label |
| 7 | Česko | 81 | location |
| 8 | Mainstream | 69 | scene |
| 9 | Emotional | 67 | mood |
| 10 | Boom Bap | 66 | genre |
| 11 | Melodic | 66 | style |
| 12 | Yzomandias | 65 | artist |
| 13 | Pop-rap | 62 | genre |
| 14 | Hip-hop | 61 | genre |
| 15 | Czech Rap | 60 | genre |
| 16 | Praha | 60 | location |
| 17 | Raw | 56 | mood |
| 18 | Nik Tendo | 51 | artist |
| 19 | Separ | 50 | artist |
| 20 | James Cole | 48 | artist |

---

## Priorita 8: Lokace bez umělců (42/42 lokací)

**Všechny lokace** postrádají explicitní vazbu `HAS_ARTIST` z lokace → umělec. Problém: lokace mají vazby `ORIGINATES_FROM` z artistů, ale ne opačně.

Řešení: Přidat `HAS_ARTIST` do lokací nebo přepracovat logiku pro zobrazení umělců na stránce lokace.

---

## Priorita 9: Labele bez umělců (5/101)

| Label | Score |
|-------|-------|
| BIG BOY BZ | 17 |
| Chop Down Records | 21 |
| Iced Out | 12 |
| L.U.Z.A. | 25 |
| Pozor Records | 8 |

Pouze 5 labelů nemá žádného přiřazeného umělce — celkem solidní coverage.

---

## Priorita 10: Taxonomie bez popisu (33 entit)

| Typ | Entita | Popis |
|-----|--------|-------|
| genre | electro | 12 chars |
| genre | newschool-rap | 18 chars |
| genre | old-school-rap | 19 chars |
| genre | Rap Rock | 37 chars |
| genre | trueschool-rap | 19 chars |
| mood | Abstract | 13 chars |
| mood | Chill | 47 chars |
| mood | Club | 9 chars |
| mood | Confident | 31 chars |
| mood | Dark | 9 chars |
| mood | Emotional | 14 chars |
| mood | Lofi | 9 chars |
| mood | Night | 47 chars |
| mood | Positive | 29 chars |
| mood | Raw | 8 chars |
| style | Aggressive | 15 chars |
| style | Conscious | 14 chars |
| style | Experimental | 17 chars |
| style | Hardcore | 13 chars |
| style | Introspective | 18 chars |

---

## Priorita 11: INDEXABLE → AUTHORITATIVE (8 entit, score 60–69)

Těsně pod sitemap čárou — kousek od AUTHORITATIVE:

| Typ | Entita | Score | Co chybí |
|-----|--------|-------|----------|
| producer | Decky | 66 | nic |
| location | Brno | 65 | img |
| location | Praha | 65 | img |
| genre | Street Rap | 61 | img |
| genre | Underground Rap | 61 | img |
| collective | 58G | 60 | nic |
| genre | Shock Rap | 60 | rels |
| genre | Trap | 60 | img |

---

## Souhrn priorit

| Priorita | Problém | Počet | Doporučená akce |
|----------|---------|-------|-----------------|
| 🔴 **1** | Artisti bez obrázku | 233 | Batch import z Base44 |
| 🔴 **2** | Entity bez popisu | 106 | Napsat description pro top 50 |
| 🟡 **3** | Draft entity | 113 | Vybrat top 20 a doplnit content |
| 🟡 **4** | Candidate → Indexable | 100 | Trochu contentu = +10 entit do sitemap |
| 🟡 **5** | Alba bez coveru | 29 | Deezer API batch search |
| 🟢 **6** | Osamocené entity | 258 | Relations cleanup |
| 🟢 **7** | Lokace bez umělců | 42 | Přidat `HAS_ARTIST` do lokací |
| 🟢 **8** | Taxonomie bez popisu | 33 | Generické description |
| 🔵 **9** | Labele bez umělců | 5 | Low priority |
| 🔵 **10** | Indexable → Auth | 8 | Kousek od sitemap — snadné wins |

---

## Rychlé wins (nízké úsilí, vysoký dopad)

1. **Trap / Street Rap / Underground Rap** — 3 nejpopulárnější genre. Přidat popis + image = +3 AUTHORITATIVE.
2. **Praha / Brno** — top lokace. Přidat image = +2 AUTHORITATIVE.
3. **Decky, 58G** — jediné co chybí je obrazek. Přidat image = +2 AUTHORITATIVE.
4. **Smack One, Strapo, Supa** — známí interpreti s prázdným popiskem. Napsat description = +3 INDEXABLE.

**Celkem rychlých wins: ~10 entit → AUTHORITATIVE (sitemap)**
