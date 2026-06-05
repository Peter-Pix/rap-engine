# RapEngine — Šablony souborů

Toto je referenční dokument se správnou strukturou pro každý typ entity.
**Pole označená ⚠️ jsou REQUIRED** — bez nich build spadne.

---

## 🎤 RAPPER — `content/raperi/[slug].mdx`

```mdx
---
title: "Jméno Rappera"              ⚠️ required
slug: "jmeno-rappera"               ⚠️ required (= název souboru bez .mdx)
realName: "Občanské jméno"             optional
born: "1995"                           optional
active: "2015–současnost"              optional
label: "Název labelu"                  optional
genre: ["drill", "trap"]              optional (seznam žánrů)
description: "Stručný popis rappera, max 200 znaků. Tohle jde do meta description a schema.org."  ⚠️ required
image: "/images/raperi/jmeno.jpg"      optional
featured: true                         optional (default: false)
publishedAt: "2024-01-15"           ⚠️ required (formát: YYYY-MM-DD)
updatedAt: "2024-06-01"                optional
relatedRappers: ["slug-1", "slug-2"]   optional (slugy jiných rapperů)
relatedAlbums: ["slug-alba"]           optional (slugy alb)
---

Hlavní text profilu. Tohle je MDX — můžeš použít Markdown i HTML.

## Sekce 1

Text o rapperovi...

## Diskografie

- **Název alba** (rok)
- **Další album** (rok)
```

### Pravidla:
- Název souboru = slug: `yzomandias.mdx`, `paulie-garand.mdx`
- `realName` je camelCase, NE `real_name`
- `genre` odkazuje na slugy žánrů: `["drill", "trap", "boom-bap"]`
- Pod frontmatterem (pod `---`) MUSÍ být alespoň jeden odstavec textu
- `description` nesmí být prázdný string `""`

---

## 💿 ALBUM — `content/alba/[slug].mdx`

```mdx
---
title: "Název Alba"                 ⚠️ required
slug: "nazev-alba"                  ⚠️ required
rapper: "Jméno Rappera"            ⚠️ required (display name)
rapperSlug: "jmeno-rappera"        ⚠️ required (slug rappera pro linking)
label: "Název labelu"                  optional
labelSlug: "slug-labelu"               optional (slug labelu pro linking)
year: 2024                          ⚠️ required (číslo, ne string)
genre: ["drill", "trap"]              optional
description: "Stručný popis alba."  ⚠️ required
image: "/images/alba/cover.jpg"        optional
tracklist:                             optional
  - "Track 1"
  - "Track 2"
  - "Track 3"
rating: 8.5                            optional (0-10)
publishedAt: "2024-01-15"          ⚠️ required
updatedAt: "2024-06-01"                optional
---

Recenze nebo popis alba.

## Zvuk

Co album definuje...

## Dopad

Jak ovlivnilo scénu...
```

### Pravidla:
- `rapper` = display name (jak se zobrazí), `rapperSlug` = slug pro interní link
- `year` je NUMBER (2024), ne string ("2024")
- `tracklist` je seznam stringů

---

## 🏢 LABEL — `content/labely/[slug].mdx`

```mdx
---
title: "Název Labelu"              ⚠️ required
slug: "nazev-labelu"               ⚠️ required
founded: "2014"                        optional
location: "Praha"                      optional
description: "Popis labelu."       ⚠️ required
image: "/images/labely/logo.jpg"       optional
artists: ["slug-rappera-1", "slug-2"]  optional (slugy umělců pro linking)
publishedAt: "2024-01-10"          ⚠️ required
---

Text o labelu.

## Historie

Jak label vznikl...

## Umělci

Kdo na labelu je...
```

### Pravidla:
- `artists` jsou SLUGY rapperů (ne jména) — pro automatické propojení
- `description` nesmí být `""` (prázdný string)

---

## 🎵 ŽÁNR — `content/zanry/[slug].mdx`

```mdx
---
title: "Název Žánru"               ⚠️ required
slug: "nazev-zanru"                ⚠️ required
origin: "Chicago, USA (2010s)"         optional
description: "Popis žánru."        ⚠️ required
image: "/images/zanry/zanr.jpg"        optional
publishedAt: "2024-01-05"          ⚠️ required
---

Text o žánru.

## Charakteristika

Co definuje zvuk...

## Česká scéna

Jak se žánr projevuje v ČR...
```

---

## 📰 ČLÁNEK — `content/clanky/[slug].mdx`

```mdx
---
title: "Název článku"              ⚠️ required
slug: "nazev-clanku"               ⚠️ required
category: "Analýza"               ⚠️ required (Analýza/Recenze/Novinky/Profil)
description: "Popis článku."       ⚠️ required
image: "/images/clanky/cover.jpg"      optional
author: "redakce"                      optional
featured: true                         optional (default: false)
publishedAt: "2024-03-15"          ⚠️ required
updatedAt: "2024-06-01"                optional
tags: ["milion-plus", "drill"]         optional
---

Text článku v MDX.

## Hlavní nadpis

Obsah...
```

---

## ⚠️ CHECKLIST — před přidáním nového souboru

1. ✅ Název souboru = slug (malá písmena, pomlčky): `paulie-garand.mdx`
2. ✅ Všechna ⚠️ required pole vyplněna
3. ✅ `publishedAt` ve formátu `"YYYY-MM-DD"` (v uvozovkách)
4. ✅ `description` není prázdný string
5. ✅ Všechna pole jsou camelCase: `realName`, `rapperSlug`, `publishedAt`
6. ✅ Pod `---` je alespoň jeden odstavec textu
7. ✅ Soubor je ve správné složce: raperi/ alba/ labely/ zanry/ clanky/

---

## 🎵 SKLADBA — `content/skladby/[slug].mdx`

```mdx
---
title: "Název skladby"             ⚠️ required
slug: "nazev-skladby-rapper"       ⚠️ required (musí být globálně unikátní)
rapper: "Jméno rappera"            ⚠️ required (display name)
rapperSlug: "jmeno-rappera"        ⚠️ required (slug pro link)
features: ["slug1", "slug2"]          optional (slugy feat. rapperů)
featuresNames: ["Jméno1", "Jméno2"]   optional (display jména feat.)
album: "Název alba"                   optional
albumSlug: "nazev-alba"               optional
year: 2019                            optional (number)
genre: ["drill", "trap"]              optional
duration: "3:42"                      optional (formát MM:SS)
trackNumber: 2                        optional
producers: ["slug1"]                  optional (slugy producentů)
producersNames: ["Jméno"]             optional (display jména)
description: "Stručný popis."      ⚠️ required
image: "/images/skladby/cover.jpg"    optional
publishedAt: "2024-06-01"          ⚠️ required
updatedAt: "2024-12-01"               optional
---

## Kontext

Popis tracku — kdy vznikl, na kterém albu, co tematicky řeší.
Auto-interlinking převede jména rapperů/labelů/žánrů v textu na linky.

## Zvuk / Produkce

Charakteristika beatu, samples, BPM, struktury.

## Téma / Lyrika

Tady popisuj o čem track je — interpretace, kontext, význam.

## Text (úryvek)

⚠️ POZOR — texty jsou autorsky chráněné. Doporučení:
- Krátké citace pro analýzu/recenzi jsou OK (§ 31 AutZ).
- Celé texty NE — porušení autorského zákona.
- Strukturální popis (počet veršů, refrén opakovaný 4×) je vždy OK.

> *"Krátký úryvek pro citaci..."*

Komentář k úryvku — proč je důležitý, co znamená.
```

### Pravidla pro slug skladby:
- **Musí být globálně unikátní** napříč všemi skladbami
- Konvence: `nazev-tracku-rapper` (např. `hellbound-yzomandias`)
- Pro tituly co sdílí název s albem: vždy přidat rappera jako sufix
- Slug může být STEJNÝ jako slug alba — různé URL prostory (`/alba/X` vs `/skladby/X`)

### Propojení s alby:
- Track má `albumSlug: "hellbound"` → na album stránce se zobrazí v tracklistu
- Album může mít `tracklist: ["Track1", "Track2"]` (text-only fallback)
- Pokud existují skladby s `albumSlug == album.slug`, tracklist se zobrazí jako linky
- Jinak se zobrazí jako prostý text

### Schema.org:
- Automaticky se generuje `MusicRecording` markup
- Obsahuje `byArtist` (primary + features), `inAlbum`, `duration`, `producer`
