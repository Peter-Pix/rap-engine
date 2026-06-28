# Audit: Odhalení AI Halucinací v rap-knowledge-graph

**Datum:** 2026-06-28  
**Auditor:** Doofy  
**Základní metriky:** 1254 entit, 5742 edges, 0 errors

---

## ⚠️ Úroveň 1: JASNE AI HALUCINACE (okamžité smazání)

| # | ID | Jméno | Proč | Akce |
|---|----|-------|------|------|
| 1 | `artist_sektor` | Sektor | AI vymyšlený "olomoucký drsňák", fake vazby na Lvcas Dope, Marpo, Smack, "rádoby nezávislost" badge of honor | ✅ SMAZÁNO commit `dcabe0f3` |

---

## 🔴 Úroveň 2: VYSOCE PRAVDĚPODOBNÉ AI HALUCINACE (žádné vazby, přehnaný jazyk)

**28 "dead" artistů = 0 edges (žádné vazby ani dovnitř ani ven)**

### 2A — Čistá AI generace (vymyšlené realName, přehnaný popis)

| ID | Jméno | realName | Proč |
|----|-------|----------|------|
| `artist_chacharski` | Chacharski | "Jan Cholewa" | "Hlas Slezska, který nepotřebuje titulky pro Ostraváky" — generický AI pattern |
| `artist_duan-vlk` | Dušan Vlk | "Dušan Vlk" | "Hlas prešovské špíny a nihilismu" — stejný AI pattern jako Sektor |
| `artist_palermo` | Palermo | "Michal Chrenko" | "Hlas, který má váhu cihly" — generický "vlastní jméno + metafora" pattern |
| `artist_pretorian` | Pretorian | "Petr Kunc" | "Jihočeský buldok s hlasem jako hrom" — AI generované cliché |
| `artist_tenki` | Tenki | "Jan Král" | "Hlasem nočních ulic a generace" — přehnaně poetický, žádné vazby |
| `artist_johny-machette` | Johny Machette | "Jonáš Čumrik" | "První český rapper, který pochopil sílu YouTube" — AI generovaný marketingový buzzword |

### 2B — Potenciálně reální, ale bez ověření (0 edges = nebezpečné)

| ID | Jméno | Poznámka |
|----|-------|----------|
| `artist_astral` | Astral | Má fotku v `public/images/artists/`, ale 0 vazeb. Frontmatter styl (mdx frontmatter místo markdown). Může být reálný, ale potřebuje ověřit vazby. |
| `artist_dejv` | DEJV | Má detailní entity.mdx (diskografie, styl), ale 0 edges. Podle popisu aktivní rapper, měl by mít vazby na alba/label. Buď AI, nebo chybí relace. |
| `artist_katannah` | Katannah | Má fotku i detailní profil. "Finalista The Mag Wrap 2024", "platinový singl 415". Pokud je to reálné, měl by mít vazby. Chybí relace nebo je to AI. |
| `artist_marger` | Marger | Britský grime → host na Meizmenově albu. Zmiňuje se o `artist_meizyy`, který existuje. Některé vazby mohou být reálné, ale celý profil je thin. |
| `artist_eris` | Eris | Zmiňuje se o Meizmenově albu. Host na skladbě. Pokud je to reálné, měla by mít vazbu na track/album. |
| `artist_loudz1` | Loudz1 | "Představitel brněnského rapu", "Loudz1 Records". Má detailní text, ale 0 edges. |

### 2C — Orphan entity (pravděpodobně AI generované)

| ID | Jméno | realName | Poznámka |
|----|-------|----------|----------|
| `artist_chubeats` | Chubeats | — | 0 edges, generický popis |
| `artist_david-beng-rostas` | David Beng Rostaš | — | "Specifická postava slovenského undergroundu" — 0 edges, AI pattern |
| `artist_haha-crew` | Haha Crew | — | Skupina, 0 edges. Možná reálná reference na Zayovu crew, ale nemá vazby. |
| `artist_kup-kodein` | Kup Kodein | — | "Slovenský rapper známy trackom TJTŽ" — 0 edges |
| `artist_loko-loko` | Loko Loko | — | "Plzeňský pouliční rapper" — 0 edges |
| `artist_lp` | Lp | — | Pouze "Umělec Lp" — stub, 0 edges |
| `artist_makin-hollov` | MAKIN HOLLOV | — | "Spoluprácou s Yzomandiasom" — ale 0 edges (měl by mít vazbu na Yzomandias) |
| `artist_matej-straka` | Matej Straka | — | "Hostoval na skladbách s Dame" — 0 edges |
| `artist_mdmx` | MDMX | — | "Člen labelu Milion Plus" — 0 edges (měl by mít vazbu na Milion+) |
| `artist_meizyy` | Meizyy | — | Duplicitní s `artist_meizyy`? Má entity.mdx, ale 0 edges |
| `artist_oty-petrina` | Ota Petřina | — | "Otec Marpa" — měl by mít vazbu na Marpo |
| `artist_resetedh` | Resetedh | — | Má fotku, "Multiplatinový producent z Ústí" — 0 edges |
| `artist_sara-rikas` | Sara Rikas | — | "První ženská interpretka v Milion+" — 0 edges (měla by mít vazbu na Milion+) |
| `artist_tkx` | Tkx | — | Pouze "Umělec Tkx" — stub |
| `artist_vneumicky` | Vneumicky | — | "Plzeňské duo" — 0 edges |

---

## 🟡 Úroveň 3: POCHYBNÝ OBSAH (neověřitelná tvrzení, 0 realName)

**282 artistů má `no_realname` + `no_origin` (to je většina databáze)**

Toto není automaticky AI halucinace — mnoho reálných rapperů nemá veřejně dostupné realName. Ale kombinace:
- NO realName
- NO origin  
- Přehnaně poetický popis ("architekt zvuku", "esence ulice")
- Žádné vazby

...zvětšuje pravděpodobnost AI generace.

---

## 📊 Souhrn nálezů

| Kategorie | Počet | Akce |
|-----------|-------|------|
| Jasné AI halucinace | 1 | ✅ Smazáno (Sektor) |
| Pravděpodobné AI (dead artists) | 28 | ❓ Potřebuje rozhodnutí |
| Stubs bez realName | 282 | ⚠️ Review potřeba |

---

## 🎯 Doporučené akce

### Okamžitě smazat (0 edges + vymyšlený realName):
1. `artist_chacharski` — "Jan Cholewa", AI pattern
2. `artist_duan-vlk` — "Dušan Vlk", AI pattern (jako Sektor)
3. `artist_palermo` — "Michal Chrenko", AI pattern
4. `artist_pretorian` — "Petr Kunc", AI pattern
5. `artist_tenki` — "Jan Král", AI pattern
6. `artist_johny-machette` — "Jonáš Čumrik", AI pattern
7. `artist_chubeats` — 0 edges, generický
8. `artist_david-beng-rostas` — 0 edges, "specifická postava"
9. `artist_lp` — pouze "Umělec Lp"
10. `artist_tkx` — pouze "Umělec Tkx"

### Ověřit a doplnit relace (potenciálně reální):
1. `artist_astral` — má fotku, frontmatter styl. Zkontrolovat jestli je v track relacích.
2. `artist_dejv` — detailní profil, aktivní rapper. Ověřit jestli má alba v systému.
3. `artist_katannah` — má fotku, detailní profil. The Mag Wrap finalist — ověřit.
4. `artist_marger` — host na Meizmenově albu. Zkontrolovat track/album entity.
5. `artist_eris` — host na Meizmenově albu. Zkontrolovat.
6. `artist_makin-hollov` — měl by mít vazbu na Yzomandias. Ověřit.
7. `artist_mdmx` — "Milion Plus". Ověřit.
8. `artist_oty-petrina` — "Otec Marpa". Měl by mít vazbu na Marpo. Ověřit.
9. `artist_sara-rikas` — "Milion Plus". Ověřit.
10. `artist_resetedh` — má fotku, "multiplatinový". Ověřit.

### Vyžaduje lidské ověření:
1. `artist_kup-kodein` — "Slovenský rapper známy trackom TJTŽ"
2. `artist_loko-loko` — "Plzeňský pouliční rapper"
3. `artist_matej-straka` — "Hostoval na skladbách s Dame"
4. `artist_haha-crew` — Skupina, možná reference na Zayovu crew
5. `artist_vneumicky` — "Plzeňské rapové duo"

---

## 🧠 Jak AI halucinace vypadají

### Sektor (již smazán):
```
"olomoucký drsňák"
"rádoby nezávislost – pro Sektor to není hendikep, ale badge of honor"
Fake vazby: Lvcas Dope, Marpo, Smack
```

### Patterny pro detekci:
1. **"Badge of honor"** — AI buzzword, nikdy nepoužíván v CZ rapu
2. **"Hlas [místa], který nepotřebuje [X]"** — generický AI pattern
3. **"Esence [místa], která nepotřebuje kompromisy"** — AI cliché
4. **Vymyšlená realName** — "Jan Cholewa", "Michal Chrenko", "Petr Kunc", "Jonáš Čumrik"
5. **"První český rapper, který..."** — AI historický claim bez zdroje
6. **"Hlas [místa] a generace"** — přehnaně poetický, nekonkrétní
7. **0 edges při detailním profilu** — AI vygeneruje text, ale nevytvoří vazby

---

## Poznámky

- **Fotky ≠ reálnost.** AI entity (Sektor) neměly fotky. Reální dead artists (Astral, Katannah, Resetedh) mají fotky.
- **Frontmatter entity.mdx** (místo běžného markdown) je starší formát — některé entity mohou být importované z jiného zdroje.
- **Meizyy / Meizyy duplikace:** `artist_meizyy` (0 edges) vs `artist_meizyy` — možná duplikát nebo starší verze.
- **"Olomouc" keyword:** `artist_doky` má "olomoucký rapper" v popisu, ale má vazby. Sektor byl "olomoucký drsňák" = 100% AI. Olomouc jako pattern pro AI generaci.

---

**Verdict:** Minimum 6 entit je téměř jistě AI halucinace. Doporučeno smazat nebo označit jako suspicious.
