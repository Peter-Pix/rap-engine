# FAKES / ERRORS — D.Kop

> **Datum auditu**: 2026-06-21 17:35
> **Source**: Discogs (artist 5731486)

---

## 🔴 F1: Origin je „Cheb" — špatně, má být „Břeclav"

**Kde**:
- `meta.json` → `origin: None` (chybí)
- `relations.json` → `locations: ["location_cheb", "location_cesko"]` ❌

**Co říká Discogs**: **Břeclav** (jižní Morava, blízko slovenských hranic)

**Co říká profile.json**: **„Architekt chebskýho soundu"**, **„západních Čech"**

**Problém**:
- Břeclav ≠ Cheb (jiná města, jiný region)
- Západní Čechy ≠ jižní Morava

**Doporučení pro opravu**:
1. `relations.json`: `location_cheb` → `location_breclav`
2. `profile.json`: přepsat zmínky „chebskýho soundu" a „západních Čech" na „jihomoravského zvuku"

**Status**: ❌ DATA ERROR — regionální informace špatná

---

## 🟡 F2: realName chybí (None)

**Kde**: `meta.json` → `realName: None`

**Cross-ref Discogs**: **David Kopecký**

**Doporučení**: `realName: "David Kopecký"`

**Status**: ❌ DATA GAP

---

## 🟡 F3: 6 keyAlbums mají role mismatch

**Kde**: `profile.keyAlbums` — D.Kop je uváděn jako hlavní interpret

**Problém**: D.Kop je **producent**, ne rapper. Tato alba jsou buď **jeho produkce pro jiné rappery** (PTK, Rest) nebo nejasné role.

**Cross-ref**:
- „PTK - Golden Kid" = album PTK, D.Kop jen produkoval
- „Restart (s Restem)" = album Resta, D.Kop produkoval

**Doporučení**: Přesunout z `keyAlbums` do nového pole `producedAlbums` nebo `asProducer`, nebo jednoduše popsat jako „produkce pro".

**Status**: ⚠️ ROLE CONFUSION — D.Kop není hlavní interpret těchto alb

---

## 🟢 OK — ověřené claimy

- ⚠️ Spolupráce s Calinem (DB description: „Blíž a Kvítek") — needs Spotify ověření
- ⚠️ Label Central Gang (DB relations.labels) — needs primary source
- ⚠️ partOf collective_jmpz (DB) — needs ověření (JMPZ crew)

---

## 📊 Souhrnný status D.Kop fact-check

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: Origin Cheb → Břeclav | 🔴 critical | ❌ DATA ERROR |
| F2: realName None | 🟡 medium | ❌ DATA GAP |
| F3: keyAlbums role mismatch | 🟡 medium | ⚠️ ROLE CONFUSION |

**Celkem**: 3 nálezy, **1 critical** (F1), 2 medium.

**AI halucinace indikátor**: profile.json obsahuje 1 superlativ + 3 marketing klíšé. Claimy jako „architekt chebskýho soundu" jsou **špatné regionálně**, ale stylově OK.

**Akce**: Okamžitě opravit F1 (regionální chyba). F2 a F3 scope decision.
