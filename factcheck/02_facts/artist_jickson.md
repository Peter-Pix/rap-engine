# Cross-reference nález — Jickson

> **Datum auditu**: 2026-06-21 17:55
> **Layer**: 2 + 3

---

## ⚠️ KRITICKÉ: Žádné primary sources

| Zdroj | Výsledek |
|-------|----------|
| Wikipedia cs (`Jickson`, `Jickson_(raper)`) | 404, 404 |
| Discogs (`Jickson&type=artist`) | 0 relevantních hitů |

**Cross-reference není možný** — žádné primární zdroje pro Jickson v DB ani online databázích.

---

## 🔍 DB pozoruhodnosti

| Pole | DB | Poznámka |
|------|-----|----------|
| `realName` | **Mathivendhan** | ⚠️ zní jako indické jméno, nekonzistentní s „pražský stínovač" (DB description). **Sám DB note přiznává nejistotu: „Datum narození ani město nejsou veřejně doložené."** |
| `origin` | Praha | needs source |
| `description` | „do českýho rapu přinesl temnotu horrorcoru" | needs source |
| `aliases` | „Jimmy Dickson / Jimmy D." (DB note) | needs source |
| `label` | YZO Empire / Milion+ (DB note) | needs source |

---

## 🟡 F1: realName „Mathivendhan" — vysoce podezřelé

**Problém**: 
- „Mathivendhan" je **typicky indické/tamilské jméno**
- DB popisuje Jickson jako **pražského** rappera
- DB sám píše „datum narození ani město nejsou veřejně doložené"
- **Žádné primární zdroje to nepotvrzují**

**Doporučení**: 
- Varianta A: Smazat realName (ponechat None jako DB samo přiznává)
- Varianta B: Ověřit u Jickson samotného (IG, oficiální web)
- Varianta C: Pokud je to z indické komunity v Praze, ponechat, ale **doplnit `originCity`**

**Status**: ❌ AI HALUCINACE nebo NEEDS SOURCE

---

## 🟡 F2: birthDate chybí

DB `birthDate: None` — **sám DB přiznává**, že není veřejně doložené. **OK, nechat None.**

**Status**: ⚠️ intentionally empty

---

## 🟡 F3: Albumy nelze ověřit

| Album | DB | Zdroj |
|-------|-----|-------|
| Origami | 2016 | needs Spotify |
| Cashmere Trail (s Nik Tendem) | 2018 | needs Spotify — ale Viktor Sheen Wiki potvrzuje **Grál (2018)** jako společné album s Jicksonem. **Cashmere Trail může být správný název** (v roce 2018 oba měli společné tracky). |
| O.A.D. (Obscure Art Deco) | 2021 | needs Spotify |
| Hlad | 2023 | needs Spotify |

---

## 📚 Citované zdroje

| URL | Datum | Typ |
|-----|-------|-----|
| https://cs.wikipedia.org/wiki/Jickson | 2026-06-21 | Wikipedia (404) |
| https://api.discogs.com/database/search?q=Jickson | 2026-06-21 | Discogs (0 relevant) |
| https://cs.wikipedia.org/wiki/Viktor_Sheen | 2026-06-21 | Wikipedia (Grál 2018 cross-ref) |

---

## ⏭️ Další vrstvy

- **Layer 4**: Spotify bio (primární pro rok a místa)
- **Layer 6**: Instagram / oficiální Jickson web
- **Layer 6**: Indie/tamilská komunita v Praze (pro realName)

---

## 📊 Status

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: realName „Mathivendhan" | 🔴 critical | ❌ NEEDS SOURCE |
| F2: birthDate None (intentional) | 🟢 OK | ⚠️ |
| F3: Albumy neověřeny | 🟡 medium | ⚠️ needs Spotify |

**Celkem**: 2 nálezy, **1 critical** (F1), 1 medium.

**AI halucinace indikátor**: profile.json obsahuje **3 superlativy** (highest spolu s Restem a Ektorem). Claimy jako „první, kdo do českýho rapu přinesl temnotu horrorcoru" nejsou nikde ověřeny. **Vysoká pravděpodobnost AI halucinace.**

**Akce**: Sdílet s Petrem — Jickson je **slovenský rapper** v Grál s Viktorem Sheenem. Pokud má reálné indické jméno, **doplnit `originCity` a poznámku**. Pokud ne, **smazat Mathivendhan**.
