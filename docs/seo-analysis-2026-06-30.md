# SEO Analýza — 4rap.cz Indexation Engine

**Datum:** 2026-06-30  
**Celkem entit:** 1,238  
**Sitemap URL:** 172 (16 static + 156 entity)

---

## Indexation State Rozdělení

| State | Počet | % | Popis |
|-------|-------|---|-------|
| **AUTHORITATIVE** | 156 | 12.6% | ✅ V sitemap, full SEO |
| INDEXABLE | 412 | 33.3% | Canonical, ne v sitemap |
| CANDIDATE | 432 | 34.9% | Příliš slabé, noindex |
| NOINDEX | 123 | 9.9% | Stub / force flag |
| DRAFT | 115 | 9.3% | Ve výstavbě |

---

## Sitemap Podle Typu (AUTHORITATIVE)

| Typ | Threshold | Počet | Příklady |
|-----|-----------|-------|----------|
| **Artist** | 60 | 115 | Annet X (95), Dalyb (95), Dame (95), Ben Cristovao (95), Čistychov (95)... |
| **Album** | 60 | 34 | Planeta opic (71), DANK (67), Mezi prsty (67)... |
| **Track** | 60 | 3 | Safír, Dealer, Odpočívej v pokoji |
| **Location** | 75 | 2 | Brno (75), Praha (75) |
| **Collective** | 65 | 1 | 58G (70) |
| **Producer** | 75 | 1 | Decky (76) |
| **Genre/Style/Theme/Mood** | 80 | 0 | Žádné — jen výjimečné |
| **Label** | 65 | 0 | Žádné — malá data |
| **Article/Event** | 60 | 0 | Žádné entity zatím |

---

## Top Scored Artists (nejlepší SEO)

| Score | Artist | Signály |
|-------|--------|---------|
| 95 | Annet X, Arleta, Ben Cristovao, Dalyb, Dame, DJ Wich, Ektor, James Cole, Jay Diesel, Kali, Kojo, Konex, Labello, Lipo, Lvcas Dope, Majk Spirit, Mike Trafik, Pil C, Protiva, Řezník, Sharlota, Sofian Medjmedj | Image + popis + vztahy + profil |
| 92 | AstralKid22, Daniel Vardan | Velmi solidní |
| 85 | 7krát3, CA$HANOVA BULHAR, DJ AKA, Dj Fatte, Dokkeytino, Dollar Prync, Fvck_Kvlt, G1nter, Hasan, Kato, LA4, Luca Brassi10x, Maniak, MC Gey, Michajlov, Nik Tendo, Paulie Garand, Prezident Lourajder, Refew, Renne Dang, Robin Tent, Robin Zoot, Saul, Sensey, Sergei Barracuda, SHIMMI, SIMA, Tafrob, Vercetti CG, Viktor Sheen, Vladimir 518, Yzomandias | Solidní core |

---

## Co chybí ve sitemap (INDEXABLE — těsně pod čárou)

| Entity | Score | Proč ne AUTHORITATIVE |
|--------|-------|----------------------|
| Street Rap (genre) | 71 | Threshold genre = 80 |
| Trap (genre) | 70 | Threshold genre = 80 |
| Boom Bap (genre) | 69 | Threshold genre = 80 |
| Lucas Blakk (producer) | 69 | Threshold producer = 75 |
| Olomouc (location) | 66 | Threshold location = 75 |
| Pardubice (location) | 66 | Threshold location = 75 |

---

## Image Sitemap

Artist images z `getArtistImage()` a album covers z `entity.image` jsou automaticky přidány jako `<image:image>` v sitemap XML.

---

## Graph-Aware lastModified

Např. artist stránka automaticky "oživne" když:
- Vyjdou nová alba (via `HAS_ALBUM`)
- Přibydou tracky (via `HAS_TRACK`)
- Změní se label (via `SIGNED_TO`)

---

## Doporučení

1. **Album entity** — 34 v sitemap je dobrý start, ale mnoho alb je CANDIDATE (score ~39). Doplnit description a image pro lepší coverage.

2. **Genre pages** — threshold 80 je agresivní. Uvažovat snížení na 75 pokud chceš indexovat "Street Rap" nebo "Trap".

3. **Location pages** — Olomouc a Pardubice (66) by mohly být v sitemap při thresholdu 70.

4. **Draft entity** — 115 artistů ve výstavbě. Prioritizovat ty s nejvyšším potenciálem.
