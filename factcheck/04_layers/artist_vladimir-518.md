# Cross-reference nález — Vladimir 518

> **Datum auditu**: 2026-06-21 17:15
> **Layer**: 2 — Interní cross-reference + 3 — External sources

---

## 🔍 Layer 2 — Interní cross-reference

### Album gap

DB `relations.albums = []` — **žádná album edge** z V518.

Cross-reference s Discogs master releases (role = Main):

| Album | Discogs master ID | DB entita | Status |
|-------|-------------------|-----------|--------|
| Gorila Vs. Architekt | 3195009 | — | ❌ chybí |
| Idiot | 587104 | — | ❌ chybí |
| Ultra! Ultra! | 1204372 | — | ❌ chybí |
| White Boy | 4037347 | — (i v profile.keyAlbums chybí!) | ❌ chybí |

**Všech 4 master alb chybí v DB.**

### Crew gap

Wikipedia potvrzuje PSH (člen od 1995-96):
- DB `relations.partOf = []` — **PSH vazba chybí**
- Discogs groups: Peneři Strýčka Homeboye (active)

Cross-reference: žádná `collective_psh` entita v DB (jako u Viktora Sheena a Crap Crew).

---

## 🌐 Layer 3 — External sources

### Wikipedia cs — POZITIVNÍ

- URL: https://cs.wikipedia.org/wiki/Vladimir_518
- Stránka je **velmi detailní**: životopis, PSH historie, label, squat Ladronka, metal/graffiti fanziny, vzdělání, rodina
- Diskografie v textu (albumy 2008, 2013, 2017, 2025 — White Boy)

### Discogs — POZITIVNÍ

- Artist ID: **2649897**
- URL: https://www.discogs.com/artist/2649897-Vladimir-518
- Real name: Vladimír Brož ✅
- Born: 8. 8. 1978 ✅
- Aliases: Wladimir (2), X-Kmen
- Groups: Peneři Strýčka Homeboye (active)
- 4 master alba role Main ✅

### PSH Wikipedia — context

- URL: https://cs.wikipedia.org/wiki/Pene%C5%99i_str%C3%BD%C4%8Dka_Homeboye
- PSH složení (členové): Orion (Michal Opletal), Vladimir 518 (připojil se 1997 — **POZOR: Wikipedia PSH říká 1997, ale V518 vlastní stránka říká 1995-96**)
- DJ Mike Trafik, Sifon (WWW), LA4 — dlouholetí spolupracovníci

⚠️ **Interní nekonzistence Wikipedia**: V518 vlastní stránka tvrdí připojení 1995-96, ale PSH stránka říká 1997. **Cross-ref fail i v primárních zdrojích.**

---

## 📊 Layer 3 výsledek

**Cross-ref VERIFIED**: Real name ✅, birth date ✅, place ✅, 3/4 master alb ✅
**Cross-ref DATA ERROR**: 0/4 (oproti Viktor Sheen)
**Cross-ref DATA GAP**: 4/4 alb bez entity, 0/1 crew bez partOf
**Cross-ref NEW CLAIM**: White Boy (2025) — chybí v profile.keyAlbums

**Přístí vrstva**: Spotify bio (White Boy 2025 release date), PSH crew entita (scope decision).
