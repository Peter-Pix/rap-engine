# FAKES / ERRORS — Jickson

> **Datum auditu**: 2026-06-21 17:55
> **Source**: žádné primární zdroje dostupné

---

## 🔴 F1: realName „Mathivendhan" — vysoce podezřelé

**Kde**: `meta.realName: "Mathivendhan"`

**Cross-ref**:
- Wikipedia cs: 404 (stránka neexistuje)
- Discogs: 0 relevantních hitů
- DB sám v `note` píše: „Datum narození ani město nejsou veřejně doložené."

**Problém**:
- „Mathivendhan" je typicky **indické/tamilské jméno**
- DB popisuje Jickson jako **pražského rappera** s horrorcorovou tematikou
- **Žádné primární zdroje to nepotvrzují**

**Doporučení**:
- Varianta A: Smazat realName (ponechat None jako DB samo přiznává)
- Varianta B: Ověřit u Jickson samotného (IG @…, oficiální web)
- Varianta C: Pokud je to z indické komunity v Praze, ponechat + doplnit `originCity`

**Status**: ❌ AI HALUCINACE nebo NEEDS SOURCE

---

## 🟡 F2: Albumy nejsou ověřeny

| Album | DB | Zdroj |
|-------|-----|-------|
| Origami | 2016 | needs Spotify |
| Cashmere Trail (s Nik Tendem) | 2018 | Wiki Viktor_Sheen potvrzuje Grál 2018; Cashmere Trail může být jiný release |
| O.A.D. (Obscure Art Deco) | 2021 | needs Spotify |
| Hlad | 2023 | needs Spotify |

**Doporučení**: Spotify bio pro ověření.

**Status**: ⚠️ NEEDS SOURCE

---

## 🟢 OK — částečně ověřeno

- ✅ Spolupráce s Viktorem Sheenem (Grál 2018) — potvrzeno Wikipedií
- ✅ Label YZO Empire / Milion+ (DB note) — needs Spotify

---

## 📊 Status

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: realName „Mathivendhan" | 🔴 critical | ❌ NEEDS SOURCE |
| F2: 4 alba neověřena | 🟡 medium | ⚠️ NEEDS SOURCE |

**Celkem**: 2 nálezy, **1 critical** (F1), 1 medium.

**AI halucinace indikátor**: profile.json obsahuje **3 superlativy** (jako Rest, Ektor). Claimy jako „první, kdo do českýho rapu přinesl temnotu horrorcoru" nejsou nikde ověřeny. **Vysoká pravděpodobnost AI halucinace u F1.**
