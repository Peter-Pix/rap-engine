# Cross-reference nález — 58G

> **Datum auditu**: 2026-06-21 17:55
> **Layer**: 2 + 3 — Interní cross-reference + Discogs

---

## 🔍 Model decision: artist_58g vs collective_58g

### Aktuální stav

| Entita | Typ | Relations | Členové |
|--------|-----|-----------|---------|
| `artist_58g` | artist | 1 album (city-park), 4 related, 2 locations, 3 genres | realName: 3 jména |
| `collective_58g` | collective | 3 genres, 1 label, 3 members (tk27, doktor601, humla) | members: ["tk27", "doktor601", "humla"] |

### Kdo referencuje koho

- `artist_robin-tent/relations.json` → `artist_58g` (related)
- Nikdo nereferencuje `collective_58g`

### Doporučení

**Varianta A (doporučeno)**: 
1. Přesunout relations z `artist_58g` do `collective_58g`
2. Opravit `artist_robin-tent` → referencovat `collective_58g`
3. Smazat `artist_58g` (legacy duplicita)

**Varianta B**:
- Ponechat obě, `artist_58g` jako redirect/alias
- Zbytečná komplexita

---

## 🔍 Album coverage gap

### DB alba vs Discogs

| DB entita | DB rok | Discogs rok | Match |
|-----------|--------|-------------|-------|
| album_58-tape-vol-1 | 2020 | 2020 | ✅ |
| album_58-tape-vol-2 | 2021 | 2021 | ✅ |
| album_city-park | 2022 | 2022 | ✅ |
| album_za-5-dvanact | **2023** | **2025** | ❌ F4 |
| (First Half) | ❌ | 2024 | ⚠️ chybí |

### Profil keyAlbums vs realita

| Profil název | Profil rok | Reálné album | Reálný rok |
|-------------|-----------|--------------|-----------|
| 58 dnu | 2020 | 58 tape vol.1 | 2020 |
| 58 gramů | 2021 | 58 tape vol.2 | 2021 |
| City Park | 2022 | City Park | 2022 |

**Závěr**: "58 dnu" a "58 gramů" jsou alternativní názvy pro tape vol.1 a vol.2. Neexistují jako samostatné Discogs releases.

---

## 🔍 Členové — DB vs Discogs

| Discogs member | DB jméno | Shoda |
|---------------|----------|-------|
| TK27 (Tomáš Kučera) | TK27 (Tomáš Kučera) | ✅ |
| Humla (2) | Jan Šmíd (Humla) | ⚠️ Discogs neuvádí realname |
| Doktor601 | Marek Dokulil (Dokkan) | ❌ Jméno se neshoduje |

**Poznámka**: DB uvádí "Marek Dokulil (Dokkan)" místo "Doktor601". Možné:
- Dokkan = alias pro Doktor601
- DB má špatné jméno (AI hallucinace)
- Potřebuje ověření z rozhovoru (Aktuálně.cz)

---

## 📊 Celkový risk assessment

| Faktor | Hodnocení |
|--------|-----------|
| Počet nálezů | 6 (1 critical, 4 medium, 1 minor) |
| Data integrity | ⚠️ Duplicitní model, chybějící relations |
| External verification | ✅ Discogs potvrzuje základní fakta |
| AI hallucination risk | 🟡 Střední (členové, názvy alb) |

**Celkově**: LOW-MEDIUM RISK. Hlavní problém je duplicitní model (artist + collective). Data errors jsou opravitelné.
