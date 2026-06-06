# Research: Konkurence + Vyhledávací poptávka + Návrh strategie

> Datum: 2026-06-06
> Stav databáze: 603 rapperů, 382 alb, 4792 skladeb, 28 článků, 92 žánrů

---

## 1. KONKURENČNÍ MAPA

### 1.1 Zpravodajství (news)
| Konkurent | Focus | Naše výhoda |
|-----------|-------|-------------|
| **RapCity.cz** | Aktuality, recenze | Nemá discografii ani entity |
| **Banger.cz** | Nový web, launch | Jen obálka, žádný obsah |
| **HHHP.cz** | Historicky zpravodajství | Nedostupný, zřejmě mrtvý |
| **Headliner.cz** | Publicistika | Širší záběr, nejen rap |

### 1.2 Data a reference
| Konkurent | Focus | Naše výhoda |
|-----------|-------|-------------|
| **Wikipedia CS** | Faktografie rapperů | Není strukturovaná, chybí discography, chybí propojení |
| **RapYT.cz** | Texty písní, discografie | Dead domain — nenačítá se |
| **RapPers.cz** | Profily rapperů | Dead domain — nenačítá se |

### 1.3 Texty písní
| Konkurent | Focus | Naše výhoda |
|-----------|-------|-------------|
| **Texty-pisni.cz** | Texty | Jen texty, žádná data, recenze |
| **Karaoketexty.cz** | Texty | Jen texty, žádná data |

### 1.4 Naše unikátní pozice

**Nikdo nedělá:**
- ✅ Strukturovaná discografie rappera (album → skladby → featy)
- ✅ Propojení rapper ↔ album ↔ skladba ↔ label ↔ žánr
- ✅ Žánrová taxonomie (92 subžánrů)
- ✅ Analytické články z reálných dat
- ✅ Entity graf (kdo s kým spolupracuje)

---

## 2. VYHLEDÁVACÍ POPTÁVKA (Google Suggest CZ)

### 2.1 TOP dotazy podle segmentu

| Segment | Dotaz | Frekvence | Naše připravenost |
|---------|-------|-----------|-------------------|
| **🏛️ Historie** | "historie ceskeho rapu" | 🔥 Střední | ❌ Nemáme |
| | "cesky rap 90 leta" | 🔥 Střední | ❌ Nemáme |
| | "cesky rap historie" | 🔥 Vysoká | ❌ Nemáme |
| **🏆 Žebříčky** | "nejlepsi cesky rapper" | 🔥🔥 Vysoká | ✅ Máme data |
| | "kdo je nejlepsi cesky rapper" | 🔥 Střední | ✅ Máme data |
| | "nejlepsi cesky rap album" | 🔥 Střední | ✅ Máme data |
| **🏷️ Žánry** | "cesky rap zanry" | 🔥 Střední | ✅ Máme (92 žánrů) |
| | "zanry ceskeho rapu" | Střední | ✅ Máme |
| **📝 Texty** | "cesky rap texty" | 🔥🔥 Vysoká | ⚠️ Částečně |
| | "texty ceskych rapperu" | 🔥 Střední | ⚠️ Částečně |
| **📅 Novinky** | "novy cesky rap" | 🔥 Střední | ⚠️ Částečně |
| | "cesky rap 2024/2025/2026" | 🔥 Střední | ❌ Nemáme |
| **🔎 True Crime** | "cesky rapper vezeni" | 🔥 Střední | ❌ Nemáme |
| | "cesky rapper drogy" | 🔥🔥 Vysoká | ❌ Nemáme |
| | "cesky rapper smrt" | 🔥 Střední | ❌ Nemáme |
| **✝️ Křížovky** | "cesky rapper krizovka" | 🔥 Střední | ✅ Máme 603 rapperů |
| **🇸🇰 Slovensko** | "slovensky rap" | 🔥 Vysoká | ✅ Máme data |
| | "slovensky rapper kali" | 🔥 Střední | ❌ Kali chybí? |
| | "slovensky rap albumy" | Střední | ✅ Máme data |

### 2.2 Zajímavé insighty

1. **"Český rapper křížovka"** je překvapivě častý dotaz — lidi hledají jména rapperů podle písmen/délky. To je low-hanging fruit.
2. **True crime segment** (vězení, drogy, smrt) má poptávku — kontroverze táhne
3. **"Nejlepší český rapper"** je evergreen — každý rok se hledá znovu
4. **Slovenský rap** má vlastní poptávku — Kali, Rytmus, Separ, Ego jsou silná klíčová slova

---

## 3. CO NÁM CHYBÍ (mezery oproti poptávce)

### 🔴 Kritické mezery

1. **SEO = 0** — není nasazeno, žádná URL v indexu Google
2. **Historický obsah** — 0 článků o historii českého rapu (90. léta, PSH, vznik scény)
3. **True crime články** — vězení, drogy, smrt v CZ/SK rapu — nikdo to nemá strukturovaně
4. **Rokové sumáře** — "Český rap 2024" — žádný článek
5. **Žebříčky/Top listy** — máme data, ale chybí články jako "Top 10 českých rapperů 2025"

### 🟡 Důležité mezery

6. **Texty písní** — máme jen názvy, ne texty
7. **Kali (SK rapper)** — chybí v databázi? (druhý nejhledanější SK rapper)
8. **Label stránky** — nemáme label profily (Milion+, Ty Nikdy, atd.)
9. **Interaktivní entity graf** — vizuální mapa kdo s kým spolupracuje

---

## 4. NÁVRH DALŠÍCH KROKŮ

### Fáze 1: Rychlé výhry (1-2 dny)

| # | Akce | Dopad |
|---|------|-------|
| 1 | **Nasadit na hosting** (Vercel/Railway/R2) | SEO začne fungovat |
| 2 | **Sitemap + robots.txt** | Google crawler |
| 3 | **Článek: "Nejlepší čeští rappeři 2026"** (Top 20 z dat) | 🔥 dosah na "nejlepsi cesky rapper" |
| 4 | **Článek: "Historie českého rapu: 90. léta"** | 🔥 pokrytí historie dotazu |
| 5 | **Přidat Kaliho** (SK rapper) | Pokrytí SK segmentu |
| 6 | **Článek: "Žánrová mapa českého rapu: 92 subžánrů"** | SEO na "cesky rap zanry" |

### Fáze 2: Budování autority (1 týden)

| # | Akce | Dopad |
|---|------|-------|
| 7 | **Článek: "Český rap 2025 v číslech"** | Data-driven yearly content |
| 8 | **Článek: "Rappeři ve vězení: Příběhy"** | True crime SEO |
| 9 | **Článek: "Kdo s kým v CZ/SK rapu spolupracuje"** (feat analýza) | Unikátní content |
| 10 | **Label profily** (Milion+, Ty Nikdy, PSH, atd.) | Struktura databáze |
| 11 | **Facebook/Instagram page** + automatické sdílení nových článků | Traffic |

### Fáze 3: Diferenciace (měsíc)

| # | Akce | Dopad |
|---|------|-------|
| 12 | **Interaktivní entity graph** (kdo nahrává s kým) | Vizuální USP |
| 13 | **Deezer player na každé stránce alba** | Praktická hodnota |
| 14 | **Weekly newsletter** o nových CZ/SK rap albech | Build audience |
| 15 | **API endpoint** pro data (REST API z Contentlayer) | Developer adoption |

### ⚡ Snadné implementace (10-15 min každá)

1. **"Čeští rappeři podle abecedy"** — stránka pro křížovkáře (A-Z seznam)
2. **"Slovenští rappeři"** — filtr/sekce
3. **"Nejproduktivnější rappeři"** — článek z dat (James Cole 37 alb, atd.)
4. **"Rappeři podle měst"** — geo tagging
5. **"Rok 2000 v českém rapu"** — co vyšlo v daném roce

---

## 5. USPs PROTI KONKURENCI

1. **Největší databáze** — 603 rapperů, 382 alb, 4792 skladeb (nikdo nemá tolik)
2. **Strukturovaná data** — ne jen text, ale entity s propojením
3. **Data-driven publicistika** — články postavené na reálných číslech
4. **CZ/SK pokrytí** — ne jen Česko nebo jen Slovensko
5. **Otevřená architektura** — Contentlayer + Next.js, snadno rozšiřitelné

---

## Závěr

**Největší problém není obsah, je to exposure.** Databáze je připravená konkurovat Wikipedii v segmentu CZ/SK rapu. Ale bez nasazení a SEO je to mrtvá váha.

**Priorita #1: Nasazení.**
**Priorita #2: 5 článků na pokrytí top dotazů.**
**Priorita #3: Sociální sítě + automatizace.**