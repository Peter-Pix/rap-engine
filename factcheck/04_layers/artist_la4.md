# Cross-reference nález — LA4

> **Datum auditu**: 2026-06-21 17:20
> **Layer**: 2 — Interní cross-reference + 3 — External sources

---

## 🔍 Layer 2 — Interní cross-reference

### Album gap

DB `relations.albums = []` — **žádná album edge** z LA4.

Cross-reference s Discogs master releases + Wikipedia:

| Album | Zdroj | DB entita | Status |
|-------|-------|-----------|--------|
| Panoptikum | Wiki (2007) | — | ❌ chybí |
| Gyzmo | Wiki (2010) | — | ❌ chybí |
| Nadzemí (EP) | Wiki (2012) | — | ❌ chybí |
| Panorama | Wiki + Discogs (2014) | — | ❌ chybí |

**Všech 4 master alb chybí v DB.**

### Crew gap

| Crew | Zdroj | DB relations.partOf |
|------|-------|---------------------|
| Indy & Wich (former) | Discogs, Wikipedia | ❌ |
| Nadzemí (spoluzakladatel 2012) | Wikipedia | ❌ |
| PSH (spolupráce od 2021) | Wikipedia | ❌ |

**3 crew vazby chybí v DB.**

---

## 🌐 Layer 3 — External sources

### Wikipedia cs — POZITIVNÍ

- URL: https://cs.wikipedia.org/wiki/LA4
- Stránka je **velmi detailní**: životopis, kariéra, spolupráce, diskografie, Bigg Boss historie, konec kariéry
- Zmínka o 9 unknown_names z AI scanu (kolegové a labelmates — většinou v DB, ale `Indy & Wich`, `Nadzemí` chybí jako crew entity)

### Discogs — POZITIVNÍ

- Artist ID: **377547** (pozn.: ID 349697 je jazz quartet, ne LA4 rapper!)
- URL: https://www.discogs.com/artist/377547-LA4-2
- Real name: **Martin Somr** ✅
- Born: March 13, 1980 ✅
- Aliases: **Laworboy**, **Gyzmo**
- Groups: Indy & Wich (former, inactive)
- 1 master album role Main: Panorama (2014)

---

## 📊 Layer 3 výsledek

**Cross-ref VERIFIED**: Label ✅, Anděl 2007 ✅, Panorama s DJ Wich ✅, konec kariéry 2022 ✅
**Cross-ref DATA ERROR**: realName „Martin Lasky" ❌ (Wiki + Discogs: Martin Somr)
**Cross-ref DATA GAP**: birthDate chybí, 4/4 alb bez entity, 3/3 crews bez partOf
**Cross-ref NEW INFO**: 2 aliases (Gyzmo, Laworboy) chybí v DB, 1 master album (Panorama) na Discogs

**Přístí vrstva**: Opravit F1 + F2 okamžitě, scope decision pro F3 + F4.
