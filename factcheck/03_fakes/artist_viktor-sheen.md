# FAKES / ERRORS — Viktor Sheen

> **Datum auditu**: 2026-06-21 16:50
> **Source**: `factcheck/01_raw/artist_viktor-sheen/` + Wikipedia cs + Discogs

---

## 🔴 F1: 4× keyAlbums mají špatný rok (systematicky +1)

**Kde**: `profile.json` → `keyAlbums`

| Album | DB uvádí | Wiki + Discogs | Odchylka |
|-------|----------|----------------|----------|
| Černobílej Svět | **2020** | **2019** | +1 rok |
| Barvy | **2021** | **2020** | +1 rok |
| Příběhy a sny | **2022** | **2021** | +1 rok |
| Planeta Opic | **2024** | **2023** | +1 rok |

**Cross-ref**: Wikipedia cs i Discogs (artist ID 3931794) se **shodují** na správných rocích. **DB profil je systematicky špatně.**

**Důvod chyby**: Pravděpodobně copy-paste chyba nebo AI halucinace — editor psal keyAlbums z paměti.

**Doporučení pro opravu**: Opravit klíčová alba na správné roky:
```json
{ "title": "Černobílej svět", "year": "2019" }
{ "title": "Barvy", "year": "2020" }
{ "title": "Příběhy a sny", "year": "2021" }
{ "title": "Planeta opic", "year": "2023" }
```

**Status**: ❌ DATA ERROR — 4/5 keyAlbums systematicky špatně

---

## 🔴 F2: Všech 7 alb chybí jako album_xxx entity v DB

**Kde**: `relations.json` → `albums: []`

**Co chybí**: Level Up EP (2014), Černobílej Svět (2019), Barvy (2020), Příběhy A Sny (2021), Roadtrip (2023), Planeta Opic (2023), Impostor Syndrom (2024).

**Cross-ref**:
- Wikipedia cs potvrzuje všech 7 alb
- Discogs potvrzuje všech 7 alb (master releases, role = Main)
- **V databázi: 0 album entit**

**Důsledek**:
- Uživatel klikne na Viktor Sheen → žádné albumy v relations, žádné „hlavní desky"
- Sitemap neobsahuje URL `/alba/...` pro Viktorovy desky
- Knowledge graph je **prázdný** pro jednoho z top 3 CZ rapperů

**Doporučení**: Vytvořit 7× `album_xxx` entit + doplnit `HAS_ALBUM` edges.

**Status**: ❌ DATA GAP — zásadní problém pro user-facing content

---

## 🟡 F3: Crap Crew chybí jako collective entita

**Kde**: DB nemá `collective_crap-crew` (nebo jiný slug) entitu.

**Cross-ref**:
- Wikipedia cs potvrzuje Viktor Sheen jako člena Crap Crew od 2009
- DB má `relations.partOf: []` — neukazuje na žádný crew
- Crap Crew entity v DB neexistuje (hledáno v cache + content/entities/)

**Doporučení**: Vytvořit `collective_crap-crew` + přidat do `partOf` u všech členů (Sheen, Time, Smith, Ensí Nyk).

**Status**: ⚠️ DB GAP — crew entita chybí

---

## 🟡 F4: DSTFRS (Da Staffers) chybí jako collective entita

**Kde**: DB nemá `collective_dstfrs` entitu.

**Cross-ref**:
- Wikipedia cs zmiňuje „Da Staffers (DSTFRS)" jako Viktorovu skupinu
- DB `relations.partOf: []`

**Doporučení**: Vytvořit `collective_dstfrs` entitu + doplnit do `partOf`.

**Status**: ⚠️ DB GAP — crew entita chybí

---

## 🟢 OK — ověřené claimy

- ✅ Real name: Viktor Dundych (sedí s Wiki + Discogs)
- ✅ Birth date: 15. 8. 1993 (sedí s Wiki)
- ✅ Born in Almaty, Kazakhstan (sedí)
- ✅ Vyrůstal na Kladně (sedí)
- ✅ Former alias Charles Sheen (sedí s Discogs)
- ✅ Alias Ivanoff (sedí s Discogs)
- ✅ Blakkwood label, opustil 2017 (sedí)
- ✅ Spotify 2021 + 2023 nejposlouchanější CZ interpret (sedí s Wiki)
- ✅ 1.2 miliard přehrání k 11/2025 (sedí s Wiki)
- ✅ Člen Crap Crew od 2009 (sedí, ale crew entita chybí v DB)

---

## 📊 Souhrnný status Viktor Sheen fact-check

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: 4× keyAlbums +1 rok | 🔴 critical | ❌ DATA ERROR |
| F2: 7 alb bez album entity | 🔴 critical | ❌ DATA GAP |
| F3: Crap Crew chybí | 🟡 medium | ⚠️ DB GAP |
| F4: DSTFRS chybí | 🟡 medium | ⚠️ DB GAP |

**Celkem**: 4 nálezy, **2 critical** (F1, F2), 2 medium.

**Akce**: F1 opravit v profile.json (rychlá oprava). F2 + F3 + F4 vyžadují scope rozhodnutí — vytvořit 9 nových entit (7 alb + 2 crews), nebo to nechat na pozdější fázi.

**AI halucinace indikátor**: profile.json obsahuje **3 superlativy** a **4 marketing klíšé** podle scan-ai-hallucinations.py. Ale claimy jako „nejposlouchanější český interpret" jsou **ověřeny Wikipedií** (Spotify 2021, 2023). **To je legitimní marketing copy, ne halucinace.**
