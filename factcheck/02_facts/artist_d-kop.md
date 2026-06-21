# Ověřená fakta — D.Kop

> **Datum auditu**: 2026-06-21 17:35
> **Status**: ✅ ČÁSTEČNĚ VERIFIED — Discogs ID existuje, cs Wikipedia ne
> **Zdroje**: https://api.discogs.com/artists/5731486, https://davidkop.com/

---

## ✅ Základní identita

| Pole | DB | Discogs | Match |
|------|-----|---------|-------|
| Real name | **None** ❌ | **David Kopecký** | ❌ **MISSING** |
| Birth date | None | (neuvedeno) | ⚠️ |
| Origin | **Cheb** (location_cheb) ❌ | **Břeclav** | ❌ **ŠPATNĚ** |
| Role | rapper | producer, sound engineer & DJ | ⚠️ **partial match** |
| Label | Central Gang | (neuvedeno) | ⚠️ |
| Aktivní | DJ od ? | DJ od ? | ⚠️ |

**Discogs URL**: https://www.discogs.com/artist/5731486-D.Kop
**Osobní web**: https://davidkop.com/

---

## ⚠️ Regionální chyba

DB uvádí **„Cheb" (location_cheb)** a profil říká **„Architekt chebskýho soundu"** + **„západních Čech"**.

Discogs jasně říká **Břeclav** (jižní Morava, blízko slovenských hranic).

**Doporučení pro opravu**:
- `meta.json` → `origin: "Břeclav"`
- `relations.json` → `location_cheb` nahradit za `location_breclav`
- `profile.json` → přepsat zmínky o „chebským soundem" a „západních Čechách"

**Status**: ❌ DATA ERROR — regionální informace je špatná

---

## ⚠️ Master alba — Discogs prázdné

D.Kop je primárně **producent**, ne rapper. Discogs master role = Main: **0**. Všechna uvedená alba v profile.keyAlbums jsou buď produkce pro jiné rappery (PTK, Rest), nebo regionální CZ/SK alba.

| Album | DB profile.keyAlbums | Discogs role | Match |
|-------|---------------------|--------------|-------|
| PTK - Golden Kid | 2021 | Co-producer / Produced by | ⚠️ role mismatch |
| PTK - Trappin Lonely | 2020 | (Co-producer) | ⚠️ |
| PTK - TRAP LIFE | 2018 | (Co-producer) | ⚠️ |
| Restart (s Restem) | 2018 | (Co-producer) | ⚠️ |
| Zpátky na trůn (s Restem) | 2022 | (Co-producer) | ⚠️ |
| Coffee & Cigarettes | 2014 | (Co-producer) | ⚠️ |

---

## 📚 Citované zdroje

| URL | Datum | Typ |
|-----|-------|-----|
| https://api.discogs.com/artists/5731486 | 2026-06-21 | Discogs API (primary) |
| https://davidkop.com/ | (potřeba manuální kontrola) | Osobní web |

---

## ⏭️ Další vrstvy

- **Layer 3**: Spotify bio
- **Layer 4**: davidkop.com (oficiální web)
- **Layer 5**: 44rap
- **Layer 5**: Calin collab diskografie (Blíž, Kvítek)
