# Systematický scan AI-halucinací — profil CZ/SK rapperů

> **Datum auditu**: 2026-06-21 16:45
> **Scope**: Všech 319 artist_xxx entit
> **Nástroj**: `scripts/scan-ai-hallucinations.py`
> **Detailní JSON**: `ai-hallucinations-scan.json` (vedle tohoto souboru)

---

## 📊 Aggregate statistics

| Metrika | Hodnota |
|---------|---------|
| Artistů naskenováno | 319 |
| **Superlativy** (nejúspěšnější, legendární, …) | **64** |
| **Marketing klíšé** | **128** |
| **Weak superlativy** (extrémně, geniální, …) | **9** |
| **Marketing jazyk** (prestiž, playlist, …) | **14** |

**Průměr na artist**: 0.6 marketingových floskulí
**Medián**: 0 (většina rapperů má čistý profil)

---

## 🚨 Top 30 podezřelých (suspicion score)

| Rank | Score | Artist | Superl. | Klíšé | Unknown names |
|------|-------|--------|---------|-------|---------------|
| 1 | 8 | **Ektor** | 4 | 10 | 3 |
| 1 | 8 | **Viktor Sheen** | 3 | 4 | **7** |
| 3 | 7 | **Rest** | 5 | 1 | **11** |
| 3 | 7 | **DJ Wich** | 4 | 2 | 6 |
| 5 | 6 | 58G | 2 | 3 | 5 |
| 5 | 6 | Vladimir 518 | 1 | 3 | 3 |
| 5 | 6 | LA4 | 1 | 3 | 9 |
| 5 | 6 | D.Kop | 1 | 3 | 7 |
| 5 | 6 | CA$HANOVA BULHAR | 2 | 4 | 6 |
| 5 | 6 | Jickson | 1 | 4 | 9 |
| 5 | 6 | Katannah | 1 | 4 | 7 |
| 5 | 6 | SHIMMI | 1 | 3 | 7 |
| 5 | 6 | Strapo | 3 | 1 | 4 |
| 14 | 5 | Grey256 | 1 | 0 | 3 |
| 14 | 5 | Labello | 1 | 2 | 8 |
| 14 | 5 | Arleta | 1 | 2 | 8 |
| 14 | 5 | **Dokkeytino** | 0 | 3 | **15** |
| 14 | 5 | Sensey | 0 | 3 | 7 |
| 14 | 5 | Dollar Prync | 1 | 2 | 5 |
| 14 | 5 | Majk Spirit | 1 | 2 | 3 |
| 14 | 5 | Pain | 0 | 5 | 5 |
| 14 | 5 | Jay Diesel | 1 | 2 | 8 |
| 14 | 5 | AstralKid22 | 0 | 4 | 5 |
| 14 | 5 | Yzomandias | 1 | 2 | 10 |
| 14 | 5 | James Cole | 0 | 4 | 12 |
| 14 | 5 | Dj Opia | 2 | 2 | 13 |
| 14 | 5 | Ben Cristovao | 1 | 2 | 4 |
| 14 | 5 | NobodyListen | 0 | 4 | 13 |
| 14 | 5 | Pil C | 1 | 2 | 4 |
| 14 | 5 | Michajlov | 1 | 2 | 3 |

---

## 🔤 Frekvence floskulí (top 10)

| Count | Pattern | Příklad |
|-------|---------|---------|
| 128× | marketing_klišé | „ako skalpel – přesná, ostrá a nekompromisní" |
| 64× | superlativy | „Král sebevědomí a nekorunovaný vládce" |
| 14× | marketingovy_jazyk | „komerční fenomén a majitel vlastního labelu" |
| 9× | weak_superlativy | „extrémně otevřenou propagací marihuany" |

---

## 🎯 Zvláštní případy

### Dokkeytino (15 unknown names)

Profil zmiňuje **15 různých velkých slov** (jména nebo termíny), **žádné z nich není v DB**. To je silný signál, že:

- Buď je Dokkeytino **velmi dobře propojený rapper** v reálném světě (kolegové, labelmates, crew), ale **chudě pokrytý v DB** (žádné z těch entit nebyly importovány).
- Nebo jsou to **AI-halucinované cross-references** — text popisuje fiktivní spolupráce, aby zněl „bohatě".

**Akce**: Layer 3 — manuální cross-reference Dokkeytino s Wikipedia / Genius.

### Rest (11 unknown names)

Rest je **5. nejpropojenější rapper** v DB (67 hran), ale 11 jmen v profilu **nejsou v DB**. Rest je známý tím, že je **členem PSH**, takže by se dalo čekat, že zmíní jména PSH crew.

**Akce**: Ověřit zda PSH crew entities existují, případně doplnit.

### James Cole, Yzomandias (10–12 unknown names)

Top rapperi, vysoký unknown names count. Tito dva jsou **velmi aktivní v collabech** — každý track s někým. Je logické, že zmiňují jména. Ale **proč ty entity nejsou v DB**?

**Akce**: Zkontrolovat, jestli `artist_xxx` entity existují v `content/entities/` pro všechna zmíněná jména. Pokud ne, Scope creep — buď doplnit, nebo opravit profil.

---

## 📋 Doporučení

### 1. Manuální audit Top 5 (Rest, Viktor Sheen, DJ Wich, Ektor, Dokkeytino)

Top 5 by mělo být ověřeno individuálně s primary sources (Wikipedia, Genius, Spotify bio). Ektor už rozpracován.

### 2. Pattern → šablona

Pokud chceš systematicky opravit všechny profily s floskulemi, navrhuju:

- **Krok 1**: Vygenerovat seznam všech pasáží s floskulemi (`grep` pattern + context)
- **Krok 2**: Pro každý nález rozhodnout: „realita" vs „AI halucinace" vs „přijatelný marketing copy"
- **Krok 3**: Opravit AI halucinace (fakta, která nejdou ověřit)

### 3. Budoucí import — guardrails

Nově importované profily by měly procházet přes tento scan, než se uloží. Pokud `suspicion_score >= 5`, flagnout jako „needs review".

Navrhuju upravit `scripts/import-base44-profiles.ts` tak, aby po importu spustil scan a varoval u podezřelých profilů.

---

## 💾 Artefakty

- **Tento soubor**: `ai-hallucinations-scan.md` (souhrn)
- **JSON detail**: `ai-hallucinations-scan.json` (per-artist findings)
- **Skript**: `scripts/scan-ai-hallucinations.py` (idempotentní, znovupustitelný)

---

## ⏭️ Další kroky

- Layer 3+ pro Top 5 podezřelé (Wikipedia, Spotify, Genius)
- Guardrails v import skriptech
- Možná automatická oprava „realita vs halucinace" v profilech
