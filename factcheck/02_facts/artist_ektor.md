# Ověřená fakta — Ektor

> **Datum auditu**: 2026-06-21
> **Status**: ✅ VERIFIED — primární zdroj existuje
> **Zdroje**: Discogs API (artist ID 2468695), cross-reference s cache
> **Pravidlo**: Fakt = min 1 primary source + URL + datum přístupu

---

## ✅ Základní identita

| Pole | DB hodnota | Ověřeno | Zdroj |
|------|-----------|---------|-------|
| Real name | Marko Elefteriadis | ✅ | Discogs API |
| Birth date | 1985-12-04 | ✅ | Discogs API |
| Birth place | Dobřichovice | ✅ | Discogs API |
| Label | Detektor Records | ⚠️ needs source | Discogs nemá label field, profil uvádí |
| Aktivní od | 2007 / 2008 | ⚠️ minor inconsistency | Diskuse v profilu, není primary source |

**Discogs URL**: https://www.discogs.com/artist/2468695-Ektor
**Přístup**: 2026-06-21 16:35

---

## ✅ Master alba (Discogs, role = Main)

| Album | Rok (Discogs) | DB publishedAt | Match |
|-------|---------------|----------------|-------|
| Detektor | **2015** | 2011 ❌ | Rok v DB špatně |
| Detektor II | **2016** | 2023 ❌ | Rok v DB hodně špatně |
| Original | **2020** | 2019 ⚠️ | Blízko (1 rok odchylka) |
| Detektor III | **2023** | 2023 ✅ | OK |
| Sativa | **2024** | 2024 ✅ | OK |

---

## ⚠️ Co chybí v Discogs (pravděpodobně regionální CZ alba)

Tato alba jsou v DB, ale Discogs nemá master release:

- **Topství** (2011 dle description) — Ektor debut
- **Tetris** (2012 dle profile.keyAlbums)
- **Alfa** (2017 dle profile.keyAlbums)
- **Marko** (2019 dle description)
- **Figury** (2013 dle publishedAt)
- **Velký hry** (2017 dle publishedAt)
- **2086** (2026 dle publishedAt)
- **Třetí oko** (2015 dle publishedAt)

**Akce**: Layer 4+ — Detektor Records oficiální web, Spotify, Apple Music.

---

## ⚠️ Rodinné vazby (částečně ověřeno)

- **Tena Elefteriadu** — matka, česká zpěvačka řeckého původu
- **Martha Elefteriadu** — teta (ne matka, jak tvrdí profile.funFacts!)

**Diskrepance**:
- `profile.funFacts[0]` tvrdí „Je synem legendární řecké zpěvačky Marthy Elefteriadu."
- Discogs říká „Son of Czech vocalist of Greek origin [Tena Elefteriadu], nephew of [Martha Elefteriadu]"
- → **F12 (minor)**: profile.funFacts mate tetu s matkou

---

## 📚 Citované zdroje

| URL | Datum přístupu | Typ |
|-----|----------------|-----|
| https://api.discogs.com/artists/2468695 | 2026-06-21 | API (primary) |
| https://api.discogs.com/artists/2468695/releases | 2026-06-21 | API (primary) |
| https://www.discogs.com/artist/2468695-Ektor | 2026-06-21 | Web (primary) |

**Chybějící primary sources**:
- cs Wikipedia — stránka o Ektorovi neexistuje (404)
- Oficiální web detektorrecords.cz — potřeba manuální kontrola
- Spotify bio — potřeba manuální kontrola
- Apple Music bio — potřeba manuální kontrola

---

## ⏭️ Další vrstvy

- **Layer 4**: Detektor Records oficiální web (regionální alba)
- **Layer 4**: Discogs credits (DJ Wich spolupráce na Tetris — needs verification)
- **Layer 5**: 44rap.base44.app cross-reference (CZ zdroj)
- **Layer 5**: rap-monitor.base44.app cross-reference
