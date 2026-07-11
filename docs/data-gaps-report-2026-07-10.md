# Data Gaps Report — rap-knowledge-graph

**Date:** 2026-07-10
**Scope:** 1,702 entit / 280 artistů / 606 alb / 427 tracků
**Verdict:** Projekt je **funkční a čistý** (0 validation errors), ale má **velký backlog draftů** a **několik zón s nízkou kvalitou dat**.

> ⚠️ **Oprava metriky (10. 7. 2026 19:40):** Původní verze reportu používala `wc -c` (bajty) pro měření velikosti MDX, což je u UTF-8 textu s českými háčky zavádějící — háčky zabírají 2 bajty. Přepracováno na `wc -w` (slova). Všechny kategorie TIER 2 (alba) a TIER 3 (articles) byly přehodnoceny. Reálný stav: **alba maj záměrný krátký formát** (ne díra), **articles 4 short form features** (ne ke smazání), **artisti 122 s tiny MDX** (skutečný backlog).

---

## 📊 Stav entit (celkový)

| Type | Total | Published | Draft | Poznámka |
|---|---|---|---|---|
| artist | 280 | ~168 | **112** | ⚠️ 40 % draftů |
| album | 606 | ~594 | **12** | ✅ Téměř hotovo |
| track | 427 | 427 | 0 | ✅ Vše hotovo (0 sparse) |
| label | 94 | 94 | 0 | ✅ Vše má description |
| location | 42 | 42 | 0 | ✅ Vše má description |
| article | 16 | 16 | 0 | ⚠️ 2× podezřele krátké |
| scene | 5 | 5 | 0 | ✅ |
| collective | 8 | 8 | 0 | ✅ |
| genre | 125 | — | — | (taxonomie, ne entita) |
| style | 24 | — | — | (taxonomie) |
| mood | 22 | — | — | (taxonomie) |
| theme | 35 | — | — | (taxonomie) |
| producer | 16 | 16 | 0 | ✅ |

---

## 🎯 TIER 1 — Rychlé wins (data existují, chybí jen doplnění)

### 1.1 Draft artisti s reálným popisem (chybí realName/label/relations)

**10 artistů**, kteří mají description ale chybí jim klíčová metadata:

| ID | Co má | Co chybí |
|---|---|---|
| `artist_2jay` | city=Brno, desc ("Člen první brněnské rapové formace Naše Věc…") | realName, label, MDX, relations |
| `artist_apoka` | city=Brno, desc ("Člen Naše Věc…") | realName, label, MDX, relations |
| `artist_drone` | city=Brno, desc ("Člen Naše Věc…") | realName, label, MDX, relations |
| `artist_dup` | city=Brno, desc ("Člen Naše Věc…") | realName, label, MDX, relations |
| `artist_scissal` | city=Brno, desc ("Člen Naše Věc…") | realName, label, MDX, relations |
| `artist_morelo` | city=Brno, desc ("Brněnský rapper…connector…Tafrob/Maniak/Stein27") | realName, label, MDX, relations |
| `artist_nase-vec` ⚠️ | city=Brno, desc ("První reálná brněnská rapová formace…") | realName, label, MDX, relations **(je to crew)** |
| `artist_zlomeny-waz` ⚠️ | city=Brno, desc ("Legendární…spoluzakladatel Zlomenej Waz") | realName, label, MDX, relations |
| `artist_eusebio` | origin=Bratislava, desc ("Multi-jazyčný rapper…španělsky…Praha") | realName, label, MDX, relations |
| `artist_berlin-manson` | origin=Bratislava, desc ("Underground…experimentální…") | realName, label, MDX, relations |
| `artist_radikal-chef` ⚠️ | ALL filled (realName Patrik Šesták, label Chef Squad, active 2006) | **jen MDX a relations** |

**Na čem záleží:** Tohle jsou **brněnský staříci** (Naše Věc, Zlomenej Waz, Morelo) a kontroverzní jména (Eusebio — multi-lang). Rychlej SEO win (Brno-scéna), a Radikal Chef je **ready to publish** — jen MDX.

**Akce:** K datům od tebe doplním `realName`, `label`, `activeSince`, `related[]` (Brno scene), `partOf[]` (crews).

---

### 1.2 Krátké texty v artists (popis existuje, ale je generic "Umělec X")

**~17 artistů** má popis `"Umělec [jméno]"` nebo `"Umělec"` — placeholder text čeká na data:

`artist_batrs, debbi, domo, grimaso, grizzly, icy-l, jakub-dekan, joshua, kenny-rough, magenta, martin-svatek, milan-andre-boronell, otis, rnz, roseck, skinny-barber, slipo, sorty, the-mag, vojtaano, wen, koukr, laris-diam, matej-straka, og-pav, zlomeny-waz`

> Pozn.: `the-mag` není rapper, je to "český rapový videomagazín a organizátor soutěže W/RAP". Zvážit přesun z `artist_` do nového typu `media_` nebo `project_`.

**Akce:** Vyžaduje **kompletní research** — pro každého zjistit kdo to je, kde je, co dělá. **Může trvat dlouho, nízká priorita**, pokud nejsou v top 100 CZ/SK rapperů.

---

## 🎯 TIER 2 — Nejkratší alba (TOP 20, 14-32 slov, doplnit popis)

**39 alb** má MDX 14-32 slov. Mrknu se, jak vypadají:

`58-tape-vol-1, 58-tape-vol-2, city-park, das-leben-feat-arleta, dej-se-vule-zbozi, dj-wich, dj-wich-remixy, dj-wich-v-kontra, figury, gyzmo, hasan, jedini-co-hresi, kasa-tape, khaosan-denpasar, kruhy-a-vlny, legalni-drogy, mc-ktory-vedel-privela, mimo-sit, odsouzeni-na-uspech, ofiko-mixtape, original-deluxe, pop, puvod-umeni, rok-psa, stanica-zoo-2, star-stable, styl, svet-bavi, tmvcjn, treti-oko, umeni-zit, valka, velke-hry, ypsilon-black, ypsilon-white, yzomandias-ii, za-5-dvanact, zloo, zustat-silnej`

**Top high-impact** (reálné slova):

| Album | B (UTF-8) | Slov | Poznámka |
|---|---|---|---|
| `album_dj-wich` | 243 | 28 | DJ Wich (2003) — chybí popis navíc |
| `album_legalni-drogy` | 255 | - | Prago Union |
| `album_yzomandias-ii` | 298 | - | Yzomandias — chybí delší popis |
| `album_zustat-silnej` | 238 | 32 | MC Gey |
| `album_hasan` | 116 | **14** | Hasan — nejmenší, fakt prázdný (jen `> Interpret · Rok · Label` + "Placeholder") |

**Kontext:** Téměř všechna alba maj **stejný standardizovaný formát**:
```mdx
# Album Title

> **Interpret:** [Artist](/raperi/x) · **Rok:** YYYY · **Label:** [Label](/labely/y)

[1-3 věty popisu, volitelné]
```

To **není chyba v datech**, to je **záměrný formát pro alba**. Detaily jdou do `tracks.json`, artist entity a labelu — album stránka je navigační rozcestník, ne content piece.

**Skutečný problém:** Jen TOP 5-10 alb s **úplně chybějícím popisem** (slab jako `album_hasan`, kde je jen "Placeholder"). Ty je potřeba doplnit 2-3 větami.

**Akce:** Pro 5-10 TOP alb doplnit 1-3 věty popisu navíc (Deezer review, kontext alba, tracklist výběr). **Nerozšiřovat na 500 slov** — album není feature článek.

**Oprava metriky:** Původní report označil 39 alb jako "sparse" podle `wc -c` (bajty). UTF-8 háčky = 2 bajty, takže 1.8 KB = reálně 250+ slov. Správná metrika pro kratší text je **počet slov** (wc -w), ne bajty. Po opravě: 39 alb má 14-32 slov, zbytek 50-149. **Žádné není "prázdné" ve smyslu chybějícího textu**.

---

## 🎯 TIER 3 — Articles kratší než průměr (možná rozšířit)

**4 articles** s nejkratším textem (224-278 slov). Pro srovnání: ostatní articles maj 707-2204 slov, průměr ~1000.

| Article | B (UTF-8) | Slov | Řádků | Poznámka |
|---|---|---|---|---|
| `article_hugo-toxxx-kontroverzni-legenda` | 1,874 | **259** | 24 | Hugo Toxxx — feature článek, sekce SuperCrooo/Anděl/Hypno 808 |
| `article_ektor-od-undergroundu-k-mainstreamu` | 1,872 | **278** | 28 | Ektor — životopis + kritika, O2 arena milestone |
| `article_rytmus-komercni-kral-slovenskeho-rapu` | 1,589 | **224** | 34 | Rytmus — Kontrafakt historie + sólovka + TV + fakta |
| `article_separ-kral-slovenskeho-rapu` | 1,768 | **245** | 18 | Separ — EP strategie + vliv na novou generaci |

**Důležitá poznámka:** Toto nejsou „krátké texty“ k smazání — jsou to **short form features** (~1-2 strany A4). Doporučení je spíš **rozšířit** je na 400-500+ slov než mazat, protože:
- TOP-3 CZ/SK rap postavy (Hugo, Ektor, Rytmus, Separ) = vysoká SEO hodnota
- Interní `related: [artist_*]` vazby fungují
- Kvalitní obsah s vlastními sekcemi, ne strohý popis

**Akce:** Rozšíření na 400-500 slov (přidat tracklisty, vlivy, kontext). Neprodlužovat vodou — kvalita > kvantita.

**Oprava metriky:** Původní report tyto articles chybně označil jako „short content“ na základě `wc -c` (počet bajtů). UTF-8 české znaky s háčky (`š`, `č`, `ě`) zabírají 2 bajty, takže 1.8 KB = reálně 250+ slov, ne „krátký text“. Správná metrika pro kratší formu je **počet slov**, ne bajtů.

---

## 🎯 TIER 4 — Tracky s chudými relations (existují, ale chudé)

**Zatím netestováno** — tracky mají MDX (0 sparse), ale **neověřoval jsem kvalitu relations**. Track entita má povinné: `album`, `artist`, `producers`, `featurings`. Doporučuju **audit na 30-50 nejnavštěvovanějších tracků** v `/skladby/`.

---

## 🔍 Čeho jsem si VŠIML (anomálie / nápady)

### ⚠️ Deduplikace: `artist_7krat3` vs `artist_7krt3`
Obojí existuje. Nutná kontrola, který je kanonický.

### ⚠️ Deprecated folders
`content/entities/deprecated-albums/` (52) a `content/entities/deprecated-artists/` (35) — obsahují staré entity, **nejsou ve validaci**, ale zabírají místo. Doporučuju audit, co tam ještě zůstává a co se dá smazat.

### ⚠️ Top labels (signed_to)
Tyhle labely mají **nejvíc artistů** — to jsou **SEO-těžká data**:
- `label_milion-plus`: 11 artistů
- `label_universal-music`: 9 artistů
- `label_blakkwood-records`: 9 artistů
- `label_ty-nikdy`: 7 artistů
- `label_independent`: 7 artistů
- `label_biggboss`: 6 artistů
- `label_1312-records`: 4 artistů

> Independent (7 artistů) je označení pro "bez labelu". Doporučuju buď **rozpustit do artist.independent: true** flag, nebo dát lepší popis.

### 💡 Brněnská scéna je podreprezentovaná
V draft je celá **brněnská stará škola** (Naše Věc, Zlomenej Waz, Morelo, 2Jay, Apoka, Drone, Dup, Scissal) + novější (Batrs, Debbi, Icy L). Brno je **historicky klíčové** pro CZ rap, ale v SEO mají menší váhu než Praha. **High impact win pro tebe**, pokud doplníš data.

### 💡 Stub-only artists (100+)
Většina draftů je "stub-only" s popisem "Plný profil bude doplněn později". To jsou **entity vytvořené aby se nerozbily reference** (broken-reference-fix-2026-06-19). **Nízká priorita** — pravděpodobně malí/obscurní rapeři, co se v projektu jenom zmiňují.

---

## 📋 Moje doporučení pro tebe (akční plán)

### 1. Rychlej Tier 1 (30-60 min práce)
- ✅ Poslat mi realName/origin/label pro **10 brněnských** artistů (2Jay, Apoka, Drone, Dup, Scissal, Morelo, Naše Věc, Zlomenej Waz, Eusebio, Berlin Manson)
- ✅ Doplnit Radikal Chef (už má vše, jen MDX)

### 2. Střední Tier 2-3 (1-2 hod práce)
- ✅ Poslat tracklisty + roku pro **10-20 top alb** (DJ Wich série, Yzomandias II, 58G, Hasan, Legalni Drogy)
- ✅ Poslat delší texty k 4 articles (Hugo Toxxx, Ektor, Rytmus, Separ)

### 3. Velký Tier 4 (2-4 hod práce, low impact)
- ⏸ Batch audit 30-50 top tracků na relations
- ⏸ Vyčistit 100+ stub artistů (buď enrichnout, nebo explicitně označit `isStub: true` a skrýt ze sitemap)

### 4. Maintenance
- ⚠️ Rozhodnout o dedupe `7krat3` vs `7krt3`
- ⚠️ Audit `deprecated-*` folders
- ⚠️ `label_independent` buď rozpustit, nebo dát lepší popis

---

## 🔧 Jak mi data posílat (formát)

Nejlepší je **copy-paste do webchatu**, v tomhle formátu:

```text
## artist_2jay
- realName: ??? (potřeba research)
- label: ???
- activeSince: ???
- related: [artist_morelo, artist_zlomeny-waz, ...]
- note: "Případné další poznámky"

## artist_radikal-chef
- MDX: "Plný text entity.mdx (300-500 slov), včetně kontextu, stylu, vlivů..."

## album_dj-wich
- tracks: [seznam]
- rok: ???
- label: ???
- note: "Doplňující info"
```

Nebo **dávkově** — pokud máš data pro 5+ entit najednou, udělej mi z toho YAML/JSON a já to batchnu.

---

## 🚀 Pokud necháš na mně (co umím udělat bez tebe)

1. **Auto-generovat** MDX templaty pro Tier 1 artists (z dostupných metadat + OpenRouter LLM) — **draft verze**, ty pak zkontroluješ
2. **Audit relations** na 30 top tracků — zjistit, co chybí
3. **Topologická analýza** labelů — kdo s kým spolupracuje
4. **Dedupe analýza** 7krat3/7krt3 + 10+ dalších podezřelých dvojic

---

**Bottom line:** Projekt je **funkční a čistý**. Hlavní díra je **112 artistů v draftu** (40 % z celkového počtu). 10 z nich je **rychlej win** (data existují v popisu), 22 je "Umělec X" placeholder (vyžaduje research), 80+ je stub-only (nízká priorita).
