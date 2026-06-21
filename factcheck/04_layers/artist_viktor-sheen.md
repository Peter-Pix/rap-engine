# Cross-reference nález — Viktor Sheen

> **Datum auditu**: 2026-06-21 16:50
> **Layer**: 2 — Interní cross-reference + 3 — External sources

---

## 🔍 Layer 2 — Interní cross-reference

### Album gap (kritický)

DB `relations.albums = []` — **žádná album edge** z Viktora Sheena.

Cross-reference s Discogs master releases:

| Album | Discogs master ID | DB entita | Status |
|-------|-------------------|-----------|--------|
| Level Up EP | 783814 | — | ❌ chybí |
| Černobílej Svět | 2068663 | — | ❌ chybí |
| Barvy | 2023585 | — | ❌ chybí |
| Příběhy A Sny | 3178902 | — | ❌ chybí |
| Roadtrip | 3178899 | — | ❌ chybí |
| Planeta Opic | 3703455 | — | ❌ chybí |
| Impostor Syndrom | 3908482 | — | ❌ chybí |

**Všech 7 master alb chybí v DB.**

### Crew gap

Wikipedia potvrzuje 2 crews:
- Crap Crew (člen od 2009)
- Da Staffers / DSTFRS (člen)

DB `relations.partOf = []` — **žádná crew edge**.

Cross-reference: žádná `collective_crap-crew` ani `collective_dstfrs` entita v DB.

### Related artists (partial cross-ref)

DB `relations.related` obsahuje 8 artistů. Cross-reference s Wikipedií:

| Related | Wikipedia zmínka | Status |
|---------|------------------|--------|
| Calin | ✅ (společné album Roadtrip 2023) | ✅ match |
| Renne Dang | ✅ (Projekt Asia 2015) | ✅ match |
| Yzomandias | ⚠️ není explicitně zmíněn | ⚠️ |
| Robin Zoot | ⚠️ není explicitně zmíněn | ⚠️ |
| Saul | ⚠️ není explicitně zmíněn | ⚠️ |
| PTK | ⚠️ není explicitně zmíněn | ⚠️ |
| Annet X | ⚠️ není explicitně zmíněn | ⚠️ |
| Hugo Toxxx | ⚠️ není explicitně zmíněn | ⚠️ |

**4/8 related** jsou v Wikipedii nezdokumentovaní — buď reálné ale nezapsané collaby, nebo AI halucinované cross-references.

---

## 🌐 Layer 3 — External sources

### Wikipedia cs — POZITIVNÍ

- URL: https://cs.wikipedia.org/wiki/Viktor_Sheen
- Stránka existuje a je **velmi detailní** (životopis, kariéra, diskografie, ocenění)
- Zmínka o **začlenění článku BUKA** — Viktor má alter ego BUKA

### Discogs — POZITIVNÍ

- Artist ID: **3931794**
- URL: https://www.discogs.com/artist/3931794-Viktor-Sheen
- 7 master alb jako role Main
- 4 aliasy: Charles Sheen, Ivanoff, Lil Buca Near (a jeden další)
- Members: prázdné (i když je členem crew — Discogs to nemodeluje stejně)

---

## 📊 Layer 3 výsledek

**Cross-ref VERIFIED**: Real name ✅, birth date ✅, place ✅, 2/7 alb ✅, aliasy ✅
**Cross-ref DATA ERROR**: 4/7 alb mají špatný rok v profile.keyAlbums
**Cross-ref DATA GAP**: 7/7 alb nemá album entitu, 0/2 crews má entitu
**Cross-ref SUSPICION**: 4/8 related artists nejsou v Wikipedii zmíněni

**Přístí vrstva**: Spotify bio (Spotify 1.2 miliard přehrání detail), Last.fm.
