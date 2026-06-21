# Ověřená fakta — Viktor Sheen

> **Datum auditu**: 2026-06-21 16:50
> **Status**: ✅ VERIFIED — primární zdroje existují (Wikipedia cs, Discogs)
> **Zdroje**: https://cs.wikipedia.org/wiki/Viktor_Sheen, https://api.discogs.com/artists/3931794
> **Přístup**: 2026-06-21 16:50

---

## ✅ Základní identita (cross-ref DB ↔ Wikipedia ↔ Discogs)

| Pole | DB | Wikipedia cs | Discogs | Match |
|------|-----|--------------|---------|-------|
| Real name | Viktor Dundych | Viktor Dundych | Viktor Dundych | ✅ |
| Birth date | 1993-08-15 | 15. srpna 1993 | (neuvedeno) | ✅ |
| Origin | Almaty (KZ); Kladno | Almaty, Kazachstán | Kladno | ✅ |
| Aktivní od | 2010 | 2009 (Crap Crew) | (neuvedeno) | ⚠️ ±1 rok |

---

## ✅ Master alba (Discogs, role = Main)

| Album | Wiki | Discogs | DB publishedAt | DB profile.keyAlbums |
|-------|------|---------|----------------|---------------------|
| Level Up EP | 2014 | **2014** | — | neuveden |
| **Černobílej Svět** | **2019** | **2019** | — | **2020** ❌ |
| **Barvy** | **2020** | **2020** | — | **2021** ❌ |
| **Příběhy A Sny** | **2021** | **2021** | — | **2022** ❌ |
| **Roadtrip** (s Calinem) | **2023** | **2023** | — | neuveden |
| **Planeta Opic** | **2023** | **2023** | — | **2024** ❌ |
| **Impostor Syndrom** | **2024** | **2024** | — | neuveden |

**Pattern**: 4 z 5 keyAlbums v `profile.json` mají release rok **+1 proti zdrojům**. Systematická chyba v editorovi profilu.

---

## ✅ Členství v labelech / crews

| Crew / Label | Wikipedia | Discogs | DB relations.partOf | Status |
|--------------|-----------|---------|---------------------|--------|
| Crap Crew | ✅ (člen od 2009) | (neuvedeno) | ❌ chybí | DB gap |
| DSTFRS (Da Staffers) | ✅ (člen) | (neuvedeno) | ❌ chybí | DB gap |
| Blakkwood | ✅ | ✅ (opustil 2017) | ✅ label_blakkwood-vlastn | ✅ |

**Cross-ref FAIL**: `relations.partOf` je prázdné — Crap Crew a DSTFRS chybí.

**Note**: `Crap Crew` entita **neexistuje v DB** (`content/entities/` nemá `collective_crap-crew`). Cross-ref fail — buď vytvořit entitu, nebo přidat do profilu poznámku.

---

## ✅ Další identita / aliasy

| Alias | Wikipedia | Discogs | DB | Status |
|-------|-----------|---------|-----|--------|
| Charles Sheen | (neuvedeno) | ✅ alias | ✅ „Dříve vystupoval jako Charles Sheen" (note) | ✅ |
| Ivanoff | (neuvedeno) | ✅ alias | ✅ „Produkuje také pod jménem ivanoff" (note) | ✅ |
| **Lil Buca Near** | (neuvedeno) | ✅ alias | ❌ neuveden | ⚠️ minor |

---

## ✅ Spotify statistiky (z Wikipedie)

- Spotify 2021: **nejposlouchanější český interpret roku**
- Spotify 2023: **nejposlouchanější český interpret roku** (znovu)
- K listopadu 2025: **1,2 miliardy přehrání** celkem

→ Dává kontext pro `description` v meta.json („Jeden z nejpopulárnějších českých rapperů")

---

## 📚 Citované zdroje

| URL | Datum | Typ |
|-----|-------|-----|
| https://cs.wikipedia.org/wiki/Viktor_Sheen | 2026-06-21 | Wikipedia (primary) |
| https://api.discogs.com/artists/3931794 | 2026-06-21 | Discogs API (primary) |
| https://api.discogs.com/artists/3931794/releases | 2026-06-21 | Discogs API (primary) |

---

## ⏭️ Další vrstvy

- **Layer 5**: Spotify bio (přímé ověření claimů o „nejstreamovanější")
- **Layer 5**: Last.fm (popularita v čase)
- **Layer 6**: Crap Crew / DSTFRS — vytvořit chybějící entity (nebo potvrdit, že jsou v scope CZ/SK)
- **Layer 6**: Album entity — 7 alb chybí jako album_xxx v DB. Scope creep, ale důležité.
