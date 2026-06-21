# FAKES / ERRORS — DJ Wich

> **Datum auditu**: 2026-06-21 17:00
> **Source**: Wikipedia cs + Discogs

---

## 🔴 F1: realName „Tomáš Karel" — špatné (již opraveno v a0895c7b)

**Kde**: `meta.json` → `realName: "Tomáš Karel"`

**Co říká Wikipedia + Discogs**: **Tomáš Pechlák**

**Doporučení**: ✅ Opraveno v commitu `a0895c7b`.

---

## 🔴 F2: „člen skupiny Hájek & Wich" — neexistující skupina (již opraveno)

**Kde**: `meta.json` → `description`

**Co říká Wikipedia + Discogs**: Žádná „Hájek & Wich" skupina. DJ Wich spolupracuje s **PSH** a tvoří duo **Indy & Wich** s rapperem Indym.

**Doporučení**: ✅ Opraveno v commitu `a0895c7b`.

---

## 🟡 F3: 7 alb chybí jako album_xxx entity

DB `relations.albums: []` — ale Discogs master role = Main: **7 alb** (Time Is Now 2004, Work Affair Mixtape 2004, The Golden Touch 2008, Panorama 2014, Mezi Prsty 2020, Černej Kůň 2021, Tlak 2022).

**Status**: ⚠️ DB GAP

---

## 🟡 F4: Cestovní horečka v MDX měla špatné roky (již opraveno)

**Kde**: `entity.mdx` uváděl „Cestovní horečka série 2005–2012"

**Cross-ref Wikipedia**: Série vyšla **2023-2024** (Paris, Barcelona, Rome, Oslo, …).

**Doporučení**: ✅ Opraveno v commitu `a0895c7b`.

---

## 🟢 OK — ověřené claimy

- ✅ Real name: Tomáš Pechlák (po opravě)
- ✅ Born 9. 6. 1978
- ✅ DJ Wich od 1998
- ✅ Skupina Indy & Wich
- ✅ Spolupráce s PSH
- ✅ 4/4 keyAlbums roky (Time Is Now 2004, Golden Touch 2008)
- ✅ Filmy: Gympl, Ulovit miliardáře, Vyšehrad
- ✅ Anděl DJ roku 2001, Žebřík 2004-2008

---

## 📊 Status

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: realName Tomáš Karel → Pechlák | 🔴 critical | ✅ OPRAVENO |
| F2: Hájek & Wich | 🔴 critical | ✅ OPRAVENO |
| F3: 7 alb bez entity | 🟡 medium | ⚠️ DB GAP |
| F4: Cestovní horečka roky | 🟡 medium | ✅ OPRAVENO |

**Celkem**: 4 nálezy, **2 critical** (oboje opraveny), 2 medium.
