# FAKES / ERRORS — Rest

> **Datum auditu**: 2026-06-21 17:00
> **Source**: Discogs artist 3231467 + Wikipedia (PSH context)

---

## 🟡 F1: 3 crews chybí v relations.partOf

**Kde**: `relations.json` → `partOf: []`

**Cross-ref Discogs**: Rest je člen:
- **Ty Nikdy** (active)
- **Divnej Postoy** (inactive)
- **A)TÝM** (active, 2024+ s Katem)

**Doporučení**: Přidat do `partOf` všechny 3. Ověřit, jestli entity existují v DB (pokud ne, scope creep — vytvořit).

**Status**: ⚠️ DB GAP — crew membership zcela chybí

---

## 🟡 F2: 5 alb chybí jako album_xxx entity

**Kde**: `relations.albums: []`

**Cross-ref Discogs**: Všech 5 master alb role Main existuje na Discogs:
- Premiéra (2010)
- Střepy (2013)
- Restart (2018)
- Tlak (2022)
- A)TÝM (2024)

**Doporučení**: Vytvořit 5× `album_xxx` entit + doplnit `HAS_ALBUM` edges.

**Status**: ⚠️ DB GAP — žádná album vazba

---

## 🟡 F3: Survivor 2026 je forward-looking claim

**Kde**: `profile.careerSummary` → „v roce 2026 se zúčastnil reality show Survivor Česko Slovensko"

**Problém**: Datum v budoucnosti (nebo současnosti), těžko ověřit. Navíc formát „Rest se zúčastnil" je **minulý čas**, ale 2026 je aktuální rok — podezření, že AI halucinace predikuje účast.

**Doporučení**: Buď smazat claim a doplnit po ověření, nebo přidat [NEVERIFIED] tag a zdrojovat po premiéře.

**Status**: ⚠️ PODEZŘENÍ — AI halucinace nebo predikce

---

## 🟡 F4: Tlak s DJ Wichem — Discogs neukazuje Wich jako producenta

**Kde**: `profile.keyAlbums[3].description` → „Temnější a technicky dokonalá deska vytvořená ve spolupráci s DJ Wichem"

**Cross-ref Discogs**: Master release 2933353 (Tlak) nemá v popisu DJ Wicha. **Premiéra + Střepy** produkoval **DJ Fatt** (master 950976 uvádí Fatt, master 3321265 pravděpodobně také).

**Doporučení**: Ověřit zdroj — buď oficiální web Restovski.cz nebo Tlak credits na Spotify/Apple Music.

**Status**: ⚠️ POTŘEBA OVĚŘENÍ — pravděpodobně chyba v profilu

---

## 🟢 OK — ověřené claimy

- ✅ Real name: Adam Chlpík (sedí s Discogs)
- ✅ Birth year: 1986 (sedí)
- ✅ Born in Trenčín (sedí)
- ✅ Žije v Praze (sedí)
- ✅ Label Ty Nikdy (sedí s Discogs member)
- ✅ 5 keyAlbums roky — všechny sedí (oproti Viktoru Sheenovi)
- ✅ Premiéra + Střepy s DJ Fattem (sedí)
- ✅ A)TÝM s Katem (sedí, kdo je Kato → Prago Union, needs cross-check)

---

## 📊 Souhrnný status Rest fact-check

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: 3 crews bez partOf | 🟡 medium | ⚠️ DB GAP |
| F2: 5 alb bez album entity | 🟡 medium | ⚠️ DB GAP |
| F3: Survivor 2026 halucinace | 🟡 medium | ⚠️ POTŘEBA OVĚŘENÍ |
| F4: Tlak + DJ Wich | 🟡 medium | ⚠️ POTŘEBA OVĚŘENÍ |

**Celkem**: 4 nálezy, **0 critical**, 4 medium.

**Akce**: F3 + F4 vyžadují primary source. F1 + F2 jsou scope rozhodnutí (vytvořit entity).
