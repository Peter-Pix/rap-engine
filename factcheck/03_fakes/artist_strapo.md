# FAKES / ERRORS — Strapo

> **Datum auditu**: 2026-06-21 17:50

---

## 🟡 F1: Description „Umělec" je placeholder

**Kde**: `meta.description: "Umělec"`

**Problém**: To není popis, je to placeholder. Žádná konkrétní informace o Strapovi.

**Doporučení**: Nahradit reálným popisem, např. „Slovenský rapper z Trnavy, 2× vítěz Artattack Freestyle Battle. Známý spoluprací s Ektorem, Deckem, Separem."

**Status**: ⚠️ DATA GAP

---

## 🟡 F2: Název alba „13. Poschodie" vs Discogs „Poschod13."

**Kde**: `profile.keyAlbums[2].title: "13. Poschodie"`

**Co říká Discogs**: `Poschod13.` (master 4016374, 2018)

**Problém**: Přeházené pořadí slov. Pravděpodobně **stejné album**.

**Doporučení**: Ověřit na Spotify. Sjednotit název.

**Status**: ⚠️ NAME INCONSISTENCY

---

## 🟡 F3: Album Versus (2015) bez Discogs master

**Kde**: `profile.keyAlbums[1]: { year: "2015", title: "Versus" }`

**Cross-ref Discogs**: Master role = Main: 2 alba (23 z 2012, Poschod13. z 2018). **Versus není mezi nimi.**

**Doporučení**: Ověřit Spotify/Apple Music. Buď regionální album (DB sedí), nebo chybný záznam.

**Status**: ⚠️ NEEDS SOURCE

---

## 🟢 OK — ověřené claimy

- ✅ Real name: Ján Strapec (sedí)
- ✅ Born 10. 3. 1989 (sedí)
- ✅ Origin Trnava (sedí)
- ✅ Album 23 (2012) — sedí
- ✅ Artattack Freestyle Battle 2× vítěz (Wiki)

---

## 📊 Status

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: Description placeholder | 🟡 medium | ⚠️ DATA GAP |
| F2: 13. Poschodie vs Poschod13. | 🟡 medium | ⚠️ NAME INCONSISTENCY |
| F3: Versus (2015) bez Discogs | 🟢 minor | ⚠️ NEEDS SOURCE |

**Celkem**: 3 nálezy, 0 critical, 2 medium + 1 minor.
