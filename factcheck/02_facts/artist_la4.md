# Ověřená fakta — LA4

> **Datum auditu**: 2026-06-21 17:20
> **Status**: ✅ VERIFIED — primární zdroje existují (Wikipedia cs + Discogs)
> **Zdroje**: https://cs.wikipedia.org/wiki/LA4, https://api.discogs.com/artists/377547

---

## ✅ Základní identita

| Pole | DB | Wikipedia cs | Discogs | Match |
|------|-----|--------------|---------|-------|
| Real name | **Martin Lasky** ❌ | Martin Somr | Martin Somr | ❌ **FAKE** |
| Birth date | **None** ❌ | 13. března 1980 | March 13, 1980 | ❌ **MISSING** |
| Origin | Praha | Praha | Prague | ✅ |
| Label | Bigg Boss | Bigg Boss (former) | Bigg Boss (former) | ✅ |
| Aktivní od | 1997 | (graffiti) | (neuvedeno) | ⚠️ přibližně |

---

## ✅ Master alba (Discogs, role = Main)

| Album | DB profile.keyAlbums | Discogs | Wikipedia | Match |
|-------|---------------------|---------|-----------|-------|
| Panoptikum | 2007 | (regionální) | **2007** | ⚠️ DB sedí, Discogs chybí |
| Gyzmo | 2010 | (regionální) | **2010** | ⚠️ DB sedí, Discogs chybí |
| Nadzemí (EP) | 2012 | (regionální) | **2012** | ⚠️ DB sedí, Discogs chybí |
| Panorama | 2014 | **2014** | **2014** | ✅ |

Pouze Panorama je na Discogs master (DB sedí). 3 alba jsou regionální CZ, chybí v mezinárodní databázi.

---

## ✅ Crew / Label membership

| Crew / Label | Wikipedia | Discogs | DB relations.partOf | Status |
|--------------|-----------|---------|---------------------|--------|
| Indy & Wich | ✅ (bývalý člen) | ✅ group inactive | ❌ | DB gap |
| Nadzemí (s Jamesem Colem, Mike Trafikem) | ✅ (spoluzakladatel) | ⚠️ (neuvedeno) | ❌ | DB gap |
| PSH (spolupráce obnovená 2021) | ✅ (příležitostně) | ⚠️ (appearance albech) | ❌ | ⚠️ parciální |
| Bigg Boss label | ✅ (2006-2017, odešel) | ✅ former member | ✅ label_biggboss | ✅ |

---

## ✅ Aliases

| Alias | Wikipedia | Discogs | DB | Status |
|-------|-----------|---------|-----|--------|
| LA4 | ✅ | ✅ | ✅ | ✅ |
| **Gyzmo / Gyzmo Lava** | ✅ (malíř) | ✅ alias | ❌ | ⚠️ DB gap |
| **Laworboy** | ⚠️ neuvedeno | ✅ alias | ❌ | ⚠️ DB gap |

---

## ✅ Ostatní ověřené claimy

- ✅ Anděl 2007 za Panoptikum (kategorie R'n'b & hip-hop) — sedí
- ✅ Bigg Boss 2006-2017 (odešel po neshodách) — sedí
- ✅ Album Panorama s DJ Wichem 2014 — sedí
- ✅ Konec rapové kariéry 2022 (v pořadu ON AIR live) — sedí
- ✅ Host na DJ Wich „Cestovní horečka 4" (2023) — sedí
- ✅ Spolupráce s Prago Union (skladba s Restem, 2016) — sedí

---

## 📚 Citované zdroje

| URL | Datum | Typ |
|-----|-------|-----|
| https://cs.wikipedia.org/wiki/LA4 | 2026-06-21 | Wikipedia (primary) |
| https://api.discogs.com/artists/377547 | 2026-06-21 | Discogs API (primary) |
| https://cs.wikipedia.org/wiki/Indy_%26_Wich | 2026-06-21 | Wikipedia (context) |

---

## ⏭️ Další vrstvy

- **Layer 4**: Spotify bio (Anděl 2007, kariéra)
- **Layer 5**: 44rap cross-reference
- **Layer 6**: Vytvořit `collective_indy-wich` + `collective_nadzemí` (chybějící crew entities)
