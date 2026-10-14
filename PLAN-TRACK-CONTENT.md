# PLAN — Fáze 2.1: Obsah tracků (stub + AI slop)

**Datum:** 14. 10. 2026

## 🔴 Zjištění (live)

```
tracků celkem:              7 151
  MDX < 200 znaků (stub):   4 704   → NOINDEX, thin content
  MDX s AI slop:              506   → "pravděpodobně", "zřejmě", "nejspíš"
  MDX OK:                   1 941
```

**Proč to bolí:**
- Stub tracky = NOINDEX (contentLength < 200) → 4 704 stránek mimo Google
- AI slop = fabulace ("produkce je pravděpodobně minimalistická") → **důvěryhodnost**

## Klíčové: DATA UŽ MÁME

Stub tracky mají:
- 99 % album + artist + zdroj
- 92 % duration
- 16 % feat, 11 % genre, 32 % label

→ **Obsah lze postavit z faktů, ne z AI.**

## Krok A — Stub MDX (4 704)

Šablona (fakta, ne AI):
```mdx
## O skladbě

„{title}“ je skladba od {artist} z alba {album} ({rok}).

## Kontext

- **Album:** {album} ({rok})
- **Délka:** {m:ss}
- **Hosté:** {feat}            ← jen když je
- **Žánr:** {genre}            ← jen když je
- **Label:** {label}           ← jen když je

## Kde ji najdeš

{odkazy: Deezer / YouTube / Spotify}   ← z extraMeta.sources
```

**Pravidla:**
- Žádné "pravděpodobně", žádné dohady
- Jen pole, která reálně existují (jinak sekce vypustit)
- Prolinkovat na album + artist entity

## Krok B — AI slop MDX (506)

- Najít věty s "pravděpodobně/zřejmě/nejspíš/může být"
- **Odstranit** (radši nic než fabulace), nebo nahradit faktem
- Nikdy nedomýšlet

## Krok C — ověření
- Rebuild cache → avgScore
- Validace + testy
- **Cíl:** avgScore 30 → 45+, indexable +3 000

## Bezpečnost
- Dry-run → vzorek → `--write`
- Záloha
- Po každém kroku validace + testy
- **Žádný AI text** — jen fakta

## Odhad: 2–3 h
