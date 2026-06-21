# Ověřená fakta — Rest

> **Datum auditu**: 2026-06-21 17:00
> **Status**: ✅ VERIFIED — primární zdroje existují (Discogs + částečně PSH Wiki pro kontext)
> **Zdroje**: https://api.discogs.com/artists/3231467, https://cs.wikipedia.org/wiki/Pene%C5%99i_str%C3%BD%C4%8Dka_Homeboye

---

## ✅ Základní identita

| Pole | DB | Discogs | Match |
|------|-----|---------|-------|
| Real name | Adam Chlpík | Adam Chlpík | ✅ |
| Birth year | 1986 | 1986 | ✅ |
| Origin | Trenčín → Praha | Trenčín → Praha | ✅ |
| Label | Ty Nikdy Records | ✅ member | ✅ |
| Aktivní od | 2003 | (neuvedeno) | ⚠️ needs source |

**Discogs URL**: https://www.discogs.com/artist/3231467-Rest-7
**Osobní web**: https://restovski.cz/

---

## ✅ Master alba (Discogs, role = Main)

| Album | DB profile.keyAlbums | Discogs | Match |
|-------|---------------------|---------|-------|
| Premiéra | 2010 | **2010** | ✅ |
| Střepy | 2013 | **2013** | ✅ |
| Restart | 2018 | **2018** | ✅ |
| Tlak | 2022 | **2022** | ✅ |
| A)TÝM | 2024 | **2024** | ✅ |

**Pattern**: Všechny roky sedí (na rozdíl od Viktora Sheena nebo Ektora).

---

## ✅ Crew membership

| Crew | Discogs member | DB relations.partOf | Status |
|------|----------------|---------------------|--------|
| Ty Nikdy | ✅ active | ❌ | DB gap |
| Divnej Postoy | ✅ inactive | ❌ | DB gap |
| A)TÝM | ✅ active | ❌ | DB gap |

**Všichni 3 crews chybí v DB.** Discogs potvrzuje všechny 3.

---

## ⚠️ Neověřené claimy (vyžadují primary source)

| Claim | Zdroj claimu | Status |
|-------|--------------|--------|
| Survivor Česko Slovensko 2026 | profile.careerSummary | ⚠️ forward-looking, vyžaduje TV Nova potvrzení |
| Art Attack Battle vítěz 2008 | meta.note | ⚠️ needs source |
| Tlak produkoval DJ Wich | profile.keyAlbums[3].description | ❌ Discogs neukazuje Wich; Premiéra+Střepy produkoval DJ Fatt, ale Tlak ne |
| Restart #1 CZ IFPI | meta.note | ⚠️ needs ČNS IFPI certifikát |
| Anděl 2022 nominace | meta.note | ⚠️ needs Anděl awards source |
| Aktivní od 2003 | meta.activeSince | ⚠️ Discogs nemá, Wikipedia neexistuje |

---

## 📚 Citované zdroje

| URL | Datum | Typ |
|-----|-------|-----|
| https://api.discogs.com/artists/3231467 | 2026-06-21 | Discogs API (primary) |
| https://api.discogs.com/artists/3231467/releases | 2026-06-21 | Discogs API (primary) |
| https://cs.wikipedia.org/wiki/Pene%C5%99i_str%C3%BD%C4%8Dka_Homeboye | 2026-06-21 | Wikipedia (context — PSH crew) |

---

## ⏭️ Další vrstvy

- **Layer 4**: Spotify bio (oficiální zdroj)
- **Layer 5**: ČNS IFPI certifikáty (Restart)
- **Layer 5**: Anděl awards historie (Tlak)
- **Layer 6**: Survivor 2026 (TV Nova)
- **Layer 6**: Vytvořit chybějící crew entity (Ty Nikdy ✅, Divnej Postoy, A)TÝM)
