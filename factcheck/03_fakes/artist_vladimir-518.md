# FAKES / ERRORS — Vladimir 518

> **Datum auditu**: 2026-06-21 17:15
> **Source**: Wikipedia cs + Discogs (artist 2649897) + PSH crew Wikipedia

---

## 🟡 F1: PSH členství chybí v relations.partOf

**Kde**: `relations.json` → `partOf: []`

**Cross-ref**: 
- Wikipedia cs: „Vladimír člen kapely [PSH] od 1995-96"
- Discogs groups: `Peneři Strýčka Homeboye` (active member)

**Doporučení**: Přidat `partOf: ["collective_psh"]` (pokud entita existuje; jinak scope decision).

**Status**: ⚠️ DB GAP — crew membership chybí

---

## 🟡 F2: 4 alba chybí jako album_xxx entity

**Kde**: `relations.albums: []`

**Cross-ref Discogs** (master releases, role = Main):
- Gorila Vs. Architekt (2008)
- Idiot (2013)
- Ultra! Ultra! (2017)
- **White Boy (2025)** — nové album, v profile.keyAlbums chybí

**Doporučení**: Vytvořit 4× `album_xxx` entity. Zároveň doplnit **White Boy (2025)** do `profile.keyAlbums`.

**Status**: ⚠️ DB GAP — 4/4 master alb bez entity, 1 chybí v keyAlbums

---

## 🟢 OK — ověřené claimy

- ✅ Real name: Vladimír Brož (sedí se všemi zdroji)
- ✅ Birth date: 8. 8. 1978 (sedí)
- ✅ Born in Hostivice (sedí)
- ✅ PSH člen (sedí s Wiki + Discogs)
- ✅ Bigg Boss label (sedí)
- ✅ Gorila vs. Architekt 2008 (sedí, oceňováno Andělem)
- ✅ 3/3 keyAlbums roky (sedí)
- ⚠️ activeSince: 1994 — DB má přibližně správně, Wiki říká 1991 (metal fanzin) nebo 1995-96 (graffiti)

---

## 📊 Souhrnný status Vladimir 518 fact-check

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: PSH bez partOf | 🟡 medium | ⚠️ DB GAP |
| F2: 4 alba bez entity + White Boy chybí v profile | 🟡 medium | ⚠️ DB GAP |

**Celkem**: 2 nálezy, **0 critical**, 2 medium.

**AI halucinace indikátor**: profile.json obsahuje 1 superlativ + 3 marketing klíšé. Ale claimy jako „architektura", „Kmeny", „Gorila vs. Architekt" jsou **všechny ověřeny Wikipedií**. **Claimy jsou legitimní, ne halucinace.**

**Akce**: Opravit F2 (doplnit White Boy do keyAlbums). F1 vyžaduje scope decision (PSH crew entita).
