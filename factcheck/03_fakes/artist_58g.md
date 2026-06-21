# FAKES / ERRORS — 58G

> **Datum auditu**: 2026-06-21 17:50
> **Zdroje**: Discogs API (artist 8106007), cross-reference s cache

---

## 🔴 F1: 58G je modelován jako sólový artist, ale je to BAND

**Kde**: `artist_58g/meta.json` → `occupation: ["rapper"]`, `realName` obsahuje 3 jména

**Cross-ref Discogs**: "Czech hip-hop (drill rap) **band** from Jihlava"

**Problém**: 
- DB má **dvě entity**: `artist_58g` (solo model) a `collective_58g` (collective model)
- `collective_58g` už má správné členy: TK27, Doktor601, Humla
- `artist_58g` je duplicitní a matoucí — má `realName` se 3 jmény, ale `occupation: ["rapper"]`
- Pouze 1 entita (`artist_robin-tent`) referencuje `artist_58g`

**Doporučení**:
- Varianta A: Smazat `artist_58g`, přesunout relations do `collective_58g`
- Varianta B: Ponechat obě, ale `artist_58g` přejmenovat na alias/redirect
- **Doporučuji A** — collective model je správný, artist model je legacy

**Status**: 🔴 CRITICAL — duplicitní model

---

## 🟡 F2: "58 dnu" a "58 gramů" v profilu neodpovídají Discogs

**Kde**: `profile.json` → `keyAlbums`

**Problém**:
- `keyAlbums[0]`: "58 dnu" (2020) — Discogs má "58 tape vol.1" (2020)
- `keyAlbums[2]`: "58 gramů" (2021) — Discogs má "58 tape vol.2" (2021)

**Pravděpodobně**: Stejná alba, jiné názvy. "58 dnu" = "58 tape vol.1", "58 gramů" = "58 tape vol.2".

**Doporučení**: 
- Opravit názvy v profile.keyAlbums na "58 tape vol. 1" a "58 tape vol. 2"
- Nebo přidat poznámku, že album je známé pod oběma názvy

**Status**: 🟡 MEDIUM — naming inconsistency

---

## 🟡 F3: Pouze 1 album v relations (city-park), chybí 3 alba

**Kde**: `relations.json` → `albums`

**Aktuálně**: `["album_city-park"]`

**Mělo by být**: `["album_58-tape-vol-1", "album_58-tape-vol-2", "album_city-park", "album_za-5-dvanact"]`

**Doporučení**: Přidat chybějící alba do relations

**Status**: 🟡 MEDIUM — DB gap

---

## 🟡 F4: Za 5 Dvanáct má špatný rok (2023 místo 2025)

**Kde**: `album_za-5-dvanact/meta.json` → `publishedAt: "2023-01-01"`, `year: 2023`

**Discogs**: 2025

**Doporučení**: Opravit na 2025

**Status**: 🟡 MEDIUM — data error

---

## 🟡 F5: "First Half" (2024 EP) chybí v DB

**Kde**: Discogs release 31021408 — 6xFile, FLAC, MP3, EP (2024)

**Doporučení**: Zvážit přidání jako album entity (EP)

**Status**: 🟢 MINOR — EP, ne album

---

## 🟡 F6: DB profil uvádí jiné členy než Discogs

**Kde**: `meta.json` → `realName`

**DB**: "Tomáš Kučera (TK27), Marek Dokulil (Dokkan), Jan Šmíd (Humla)"

**Discogs**: TK27 (Tomáš Kučera ✅), Humla (2) (realname neuveden), Doktor601 (realname neuveden)

**Problém**:
- DB uvádí "Marek Dokulil (Dokkan)" — Discogs nezná "Dokkan", má "Doktor601"
- DB uvádí "Jan Šmíd (Humla)" — Discogs má "Humla (2)" bez realname

**Možnosti**:
1. DB má správná jména (Marek Dokulil = Dokkan, Jan Šmíd = Humla) — Discogs je neúplný
2. DB má AI-hallucinovaná jména

**Doporučení**: Ověřit přes rozhovor (Aktuálně.cz zdroj v profile.sources) nebo oficiální web 58g.cz

**Status**: ⚠️ POTŘEBA OVĚŘENÍ

---

## 🟢 OK

- ✅ Origin: Jihlava (Discogs potvrzuje)
- ✅ TK27 real name: Tomáš Kučera (Discogs potvrzuje)
- ✅ Aktivní od 2020 (Discogs: první release 2020)
- ✅ City Park 2022 (Discogs potvrzuje)
- ✅ Za 5 Dvanáct existuje (Discogs potvrzuje, jen rok špatně)

---

## 📊 Souhrnný status 58G

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: Duplicitní model (artist + collective) | 🔴 critical | ⚠️ MODEL DECISION |
| F2: "58 dnu"/"58 gramů" naming | 🟡 medium | ⚠️ |
| F3: Chybějící alba v relations | 🟡 medium | ⚠️ DB GAP |
| F4: Za 5 Dvanáct rok 2023 vs 2025 | 🟡 medium | ❌ DATA ERROR |
| F5: First Half EP chybí | 🟢 minor | ⚠️ |
| F6: Členové se neshodují s Discogs | 🟡 medium | ⚠️ NEEDS SOURCE |

**Celkem**: 6 nálezů, 1 critical, 4 medium, 1 minor.
