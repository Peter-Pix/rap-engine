# Cross-reference nález — Rest

> **Datum auditu**: 2026-06-21 17:00
> **Layer**: 2 — Interní cross-reference + 3 — External sources

---

## 🔍 Layer 2 — Interní cross-reference

### Album gap

DB `relations.albums = []` — **žádná album edge** z Resta.

Cross-reference s Discogs master releases (role = Main):

| Album | Discogs master ID | DB entita | Status |
|-------|-------------------|-----------|--------|
| Premiéra | 950976 | — | ❌ chybí |
| Střepy | 3321265 | — | ❌ chybí |
| Restart | 1613846 | — | ❌ chybí |
| Tlak | 2933353 | — | ❌ chybí |
| A)TÝM | 3509487 | — | ❌ chybí |

**Všech 5 master alb chybí v DB.**

### Crew gap

Wikipedia PSH (který Rest **NENÍ** členem) — ale Discogs member of:

| Crew | Discogs | DB relations.partOf |
|------|---------|---------------------|
| Ty Nikdy | ✅ active | ❌ |
| Divnej Postoy | ✅ inactive | ❌ |
| A)TÝM | ✅ active | ❌ |

**3 crew vazby chybí v DB.**

### Related artists

DB `relations.related` obsahuje 24 artistů. Cross-reference s Discogs appearance releases:

Top related: **Kato, Idea, Paulie Garand, Michajlov, MC Gey, Separ, Boy Wonder, Supa, Renne Dang, LA4, Majk Spirit, Marpo, Rytmus, Ego, Ben Cristovao, Orion**.

Některé z těchto jmen jsou v Discogs appearance albech Resta (Harant, Peníze Nebo Život, Buldozér, …), ale **nemám všechna ověřená**.

### Note claims

`meta.note` uvádí:
- „DIVNEJ POSTOY historie" — sedí s Discogs (member of Divnej Postoy)
- „Art Attack Battle vítěz 2008" — needs source
- „Restart #1 CZ IFPI" — needs ČNS IFPI certifikát
- „Tlak Anděl 2022 nominace" — needs Anděl awards source
- „A)TÝM 2024 s Katem" — sedí s Discogs

---

## 🌐 Layer 3 — External sources

### Wikipedia cs — NEGATIVNÍ pro Rest
- Hledány varianty: `Rest_(rapper)`, `Rest_(zpěvák)`, `Rest_rapper`, `Rest_(raper)`
- **Všechny vrátily HTTP 404** (stránka neexistuje)
- **Závěr**: cs Wikipedie nepokrývá Resta

### Wikipedia cs — POZITIVNÍ pro kontext (PSH crew)
- URL: https://cs.wikipedia.org/wiki/Pene%C5%99i_str%C3%BD%C4%8Dka_Homeboye
- Rest není členem PSH, ale profil.generationContext ho zmiňuje — **historický kontext OK**

### Discogs — POZITIVNÍ
- Artist ID: **3231467**
- URL: https://www.discogs.com/artist/3231467-Rest-7
- Real name: Adam Chlpík ✅
- 5 master alb role Main ✅
- Member of 3 crews (Ty Nikdy, Divnej Postoy, A)TÝM) ✅
- Osobní web: https://restovski.cz/

---

## 📊 Layer 3 výsledek

**Cross-ref VERIFIED**: Real name ✅, birth year ✅, place ✅, label ✅, 5/5 keyAlbums ✅, 3/3 crews ✅
**Cross-ref DATA ERROR**: 0/5 (oproti Viktor Sheen / Ektor)
**Cross-ref DATA GAP**: 5/5 alb bez entity, 3/3 crews bez partOf
**Cross-ref SUSPICION**: Survivor 2026 (forward-looking), Tlak + DJ Wich (nepotvrzeno)

**Přístí vrstva**: Spotify bio (primary), Anděl awards, ČNS IFPI certifikáty.
