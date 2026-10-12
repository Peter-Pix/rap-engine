# Plán: Díry v obsahu + propojení sítě + Porovnat rapery (12. 10. 2026)

## Diagnóza (ověřená data)
- 5787 entit (4509 track, 604 album, 279 artist, 124 genre...), 34992 hran
- **Jádro problému:** artist-level metadata jsou extrémně řídká, i když
  track-level je bohatý. Porovnává se artist↔artist, ale artisti nemají
  agregované vlastnosti svých tracků.

### Artist-level vazby (279 artistů)
| Relace | Má | % | Problém |
|--------|-----|---|---------|
| HAS_GENRE | 157 | 56% | OK-ish |
| HAS_STYLE | 47 | 17% | 🚨 řídké |
| HAS_MOOD | 33 | 12% | 🚨 řídké |
| HAS_THEME | 8 | 3% | 🚨 skoro nic |
| BELONGS_TO_SCENE | 11 | 4% | 🚨 skoro nic |
| RELATED_ARTIST | 223 | 80% | 108 bez vazby |
| ORIGINATES_FROM | 273 | 98% | OK |

### Track-level vazby (bohaté, nepropagované na artistu)
- HAS_MOOD: 6197 · HAS_GENRE: 4525 · HAS_THEME: 4053 · HAS_STYLE: 608

### Další díry
- 2944 tracků (65%) bez HAS_GENRE
- 182 alb bez RELEASED_BY (label)
- FEATURES jen 357 hran (292 tracků s feat)
- PRODUCED_BY jen 162

## Plán (fáze podle hodnoty/bezpečnosti)

### Fáze A — Propagace track→artist signálů (NEJVYŠŠÍ hodnota, ~2h)
Agregovat track-level žánry/nálady/témata/styly na artistu. Když artista má
tracky s mood X, artist získá HAS_MOOD X.
- **Vstup:** HAS_ARTIST (track→artist) + HAS_MOOD/HAS_THEME/HAS_STYLE/HAS_GENRE (track→X)
- **Výstup:** nové artist→X hrany (agregované)
- **Bezpečné:** čistě odvozené z existujících faktů, žádná nová "vymyšlená" data
- **Dopad:** porovnání přestane být kostrbaté (artisti budou mít reálné signály)

### Fáze B — RELATED_ARTIST z kolaborací (~1.5h)
Doplnit síť vztahů mezi rapery z FEATURES + PRODUCED_BY + label + scéna.
- Dva artisti na stejném tracku (feat) → RELATED_ARTIST
- Producent → artisti (PRODUCED_BY) → RELATED_ARTIST
- Stejný label → RELATED_ARTIST
- **Bezpečné:** odvozené z existujících vazeb

### Fáze C — Doplnit žánry 2944 trackům (data, ~2h)
Z albových žánrů (album má genre, track je v albu → track získá genre).
- **Bezpečné:** ID-based (track→album→genre), ne name match
- Alternativa: z tracks.json Deezer genres (kde ověřeno)

### Fáze D — Porovnat rapery vylepšení (UI+algo, ~2-3h)
1. **Nepřímé propojení (BFS)** — teď jen přímé shody. Přidat "společný
   spolupracovník" (A feat s X, B feat s X → X je spojka).
2. **Skóre podobnosti** — číselné skóre (0-100%) jako u getSimilarTracks.
3. **Agregované statistiky** — počet tracků, alb, featurů, let aktivní.
4. **Prázdný stav** — když nemají nic společného, ukázat "propojení přes síť".

### Fáze E — 182 alb bez labelu + FEATURES audit (data, ~1.5h)
Doplnit labely z Deezeru (ID-based) + zkontrolovat feat parsing.

## Pořadí provedení
A → B → C → D → E (A+B jsou nejrychlejší výhra pro porovnávání)

## Bezpečnost
- Vše odvozené z existujících faktů (žádná halucinace)
- DRY_RUN default, záloha před zápisem
- ID-based (žádný name match)
- Po každé fázi: cache:build + cache:validate + commit
