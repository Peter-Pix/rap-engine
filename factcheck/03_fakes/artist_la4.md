# FAKES / ERRORS — LA4

> **Datum auditu**: 2026-06-21 17:20
> **Source**: Wikipedia cs + Discogs (artist 377547)

---

## 🔴 F1: realName „Martin Lasky" — špatné skutečné jméno

**Kde**: `content/entities/artist_la4/meta.json` → `realName: "Martin Lasky"`

**Co říká Wikipedia cs**: **Martin Somr**
**Co říká Discogs**: **Martin Somr**

**Problém**: V databázi je úplně špatné jméno. „Martin Lasky" neodpovídá žádnému zdroji.

**Doporučení pro opravu**: `realName: "Martin Somr"`

**Status**: ❌ DATA ERROR — kritické (ovlivňuje Schema.org Person.name)

---

## 🔴 F2: birthDate chybí (None)

**Kde**: `meta.json` → `birthDate: None` (chybí field)

**Cross-ref**:
- Wikipedia cs: **13. března 1980**
- Discogs: **March 13, 1980**

**Doporučení pro opravu**: `birthDate: "1980-03-13"`

**Status**: ❌ DATA GAP — chybí klíčový údaj

---

## 🟡 F3: 3 crew vazby chybí v relations.partOf

**Kde**: `relations.partOf: []`

**Cross-ref**:
- Discogs groups: **Indy & Wich** (former)
- Wikipedia: **Nadzemí** (spoluzakladatel s Jamesem Colem + Mike Trafikem, 2012)
- Wikipedia: **PSH** (spolupráce od 2021)

**Doporučení**: Přidat do `partOf`: `Indy & Wich` (former), `Nadzemí`, případně `PSH`.

**Status**: ⚠️ DB GAP

---

## 🟡 F4: 4 alba chybí jako album_xxx entity

**Kde**: `relations.albums: []`

**Cross-ref**:
- Panoptikum (2007) — DB sedí, Discogs chybí
- Gyzmo (2010) — DB sedí, Discogs chybí
- Nadzemí (2012 EP) — DB sedí, Discogs chybí
- Panorama (2014) — DB sedí, Discogs sedí

**Doporučení**: Vytvořit 4× `album_xxx` entity.

**Status**: ⚠️ DB GAP

---

## 🟢 OK — ověřené claimy

- ✅ Label Bigg Boss (former) — sedí
- ✅ Anděl 2007 za Panoptikum — sedí
- ✅ Album Panorama s DJ Wichem 2014 — sedí
- ✅ Konec rapové kariéry 2022 — sedí
- ✅ Host Cestovní horečka 4 (2023) — sedí
- ✅ 4/4 keyAlbums roky — sedí

---

## 📊 Souhrnný status LA4 fact-check

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: realName Martin Lasky → Martin Somr | 🔴 critical | ❌ DATA ERROR |
| F2: birthDate chybí | 🔴 critical | ❌ DATA GAP |
| F3: 3 crew vazby chybí | 🟡 medium | ⚠️ DB GAP |
| F4: 4 alba bez entity | 🟡 medium | ⚠️ DB GAP |

**Celkem**: 4 nálezy, **2 critical** (F1, F2), 2 medium.

**AI halucinace indikátor**: profile.json obsahuje 1 superlativ + 3 marketing klíšé. Ale claimy o Andělu, Panoptikum, labelu Bigg Boss jsou **všechny ověřeny Wikipedií**. **Claimy jsou legitimní, ne halucinace.**

**Akce**: Okamžitě opravit F1 + F2 (data errors). F3 + F4 scope decision.
