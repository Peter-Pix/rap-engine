# Cross-reference nález — D.Kop

> **Datum auditu**: 2026-06-21 17:35
> **Layer**: 2 — Interní cross-reference + 3 — External sources

---

## 🔍 Layer 2 — Interní cross-reference

### Regionální chyba

DB `locations: ["location_cheb", "location_cesko"]` — **Cheb je v západních Čechách**, ale D.Kop je z **Břeclavi** (jižní Morava).

| Zdroj | Místo |
|-------|-------|
| Wikipedia | (neexistuje) |
| Discogs | **Břeclav** ✅ |
| DB location_cheb | ❌ Cheb |
| DB profile.text | ❌ „chebskýho soundu" |
| DB profile.text | ❌ „západních Čech" |

### Album gap (role confusion)

DB `relations.albums = []` — ale profile.keyAlbums uvádí 6 alb.

Cross-ref: D.Kop je **producent**, ne rapper. Všech 6 uváděných alb jsou produkce pro jiné rappery:
- PTK alba (Golden Kid, Trappin Lonely, Trap Life)
- Rest alba (Restart, Zpátky na trůn)
- Coffee & Cigarettes (D.Kop jako rapper? nebo produkce?)

---

## 🌐 Layer 3 — External sources

### Wikipedia cs — NEGATIVNÍ

- Hledány varianty: `D.Kop`, `D-Kop`, `D_Kop_(rapper)`, atd.
- **Všechny vrátily HTTP 404**

### Discogs — POZITIVNÍ

- Artist ID: **5731486**
- URL: https://www.discogs.com/artist/5731486-D.Kop
- Real name: **David Kopecký** ✅
- Origin: **Břeclav** ✅
- Profile: „Czech producer, sound engineer & DJ from Břeclav"
- 0 master alba role Main (všechno buď appearance nebo co-producer)

### Osobní web (needs manual check)

- URL: https://davidkop.com/

---

## 📊 Layer 3 výsledek

**Cross-ref VERIFIED**: Real name (přes Discogs), origin Břeclav
**Cross-ref DATA ERROR**: Regionální info v DB je špatně (Cheb → Břeclav)
**Cross-ref DATA GAP**: realName chybí, 6 keyAlbums bez album_xxx entity
**Cross-ref ROLE CONFUSION**: D.Kop je producent, ne rapper — DB prezentuje jako hlavní interpret

**Přístí vrstva**: Spotify bio, davidkop.com, ověření spolupráce s Calinem.
