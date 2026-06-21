# Fact-check Pipeline

> **Cíl**: Pomalý, poctivý, vrstvený fact-check CZ/SK rapové databáze.
> Adresář `factcheck/` je **mimo aktuální data** — bezpečně stranou od produkčních dat.

## Struktura

```
factcheck/
├── 01_raw/        # Surová data z entit (entity.mdx, profile.json, meta.json) + URL provenance
├── 02_facts/      # Ověřená fakta s primary/secondary/tertiary zdroji
├── 03_fakes/      # Identifikované fake/errory/AI halucinace
├── 04_layers/     # Cross-references mezi entitami, nové patterny
└── 99_logs/       # Timestamped log sessions
```

## Vrstvy fact-checku

### Vrstva 1: Metadata vs interní konzistence
- ID, slug, title → sedí?
- description vs MDX content → bez duplikátů?
- extraMeta vs MDX claims (birthDate, origin, activeSince)?
- relations → validní cílové entity?
- profile vs known scope (CZ/SK only)?

### Vrstva 2: Interní cross-reference
- Artist A "člen crew X" → relations má crew X?
- Album "feat Y" → artist Y existuje v DB?
- Location "Rodiště X" → artist X má origin = location?

### Vrstva 3: External sources (primární)
- Wikipedia (cs + sk)
- Oficiální web / label page
- Spotify / Apple Music bio
- Rozhovory (aktualne.cz, headliner.cz, bbarak.cz)

### Vrstva 4: External sources (sekundární)
- Genius.com lyrics + metadata
- Discogs.com (release dates, credits)
- MusicBrainz (strukturovaná data)

### Vrstva 5: Aggregators (terciární)
- 44rap.base44.app (náš primární datový zdroj)
- rap-monitor.base44.app
- Databáze CZ/SK rapu (fanklub, blogy)

### Vrstva 6: Inferred / Cross-domain
- Sociální sítě (IG, Twitter) — datum narození, lokace
- YouTube kanály — datum registrace, první upload
- Spotify monthly listeners — popularita v čase

### Vrstva 7: AI halucinace
- Obsah co zní jako generický marketing
- Interní nekonzistence (datum narození ≠ věk v jiném zdroji)
- "Velmi úspěšný rapper z Brna" — klišé
- Detail co nikde jinde neexistuje (vygooglitelný)

## Workflow

```
Entity → [01_raw snapshot] → Layer analysis
  → FAKT?  → [02_facts/<entity>.md]  + cite sources
  → FAKE?  → [03_fakes/<entity>.md]  + cite why fake
  → UNCLEAR → [04_layers/<entity>.md]  + needs more research

Each session logged in [99_logs/YYYY-MM-DD-HHMM.md]
```

## Pravidla

1. **Pomalý**: 1-2 entity za session, ne všechny najednou
2. **Poctivý**: Každý fakt = min 1 primary source
3. **Vrstvený**: Nová vrstva jen když předchozí dává smysl
4. **Zapisovat vše mimo aktuální data**: nikdy ne modifikuj `content/entities/` z fact-checku
5. **Idempotentní**: Každý soubor v `02_facts/` a `03_fakes/` má YYYY-MM-DD datum poslední revize
6. **Auditovatelný**: Každý claim = source URL + datum přístupu

## Co NEDĚLÁM

- ❌ Neupravuju `content/entities/` ani `src/`
- ❌ Nepoužívám AI generování pro "fakta" — všechny musí mít primary source
- ❌ Nemažu ani neignoruju `03_fakes/` — i fake záznamy jsou data
- ❌ Neměním scope (CZ/SK only) bez explicitního schválení

## Status

| Vrstva | Pokrytí | Datum |
|--------|---------|-------|
| 1. Metadata | 0/1349 | — |
| 2. Cross-ref | 0/1349 | — |
| 3. Wikipedia | 0/1349 | — |
| 4. Discogs/MB | 0/1349 | — |
| 5. 44rap/rap-monitor | 0/1349 | — |
| 6. Socials | 0/1349 | — |
| 7. AI halucinace | 0/1349 | — |

**Start**: 20. 6. 2026 02:08
**Approach**: Top-down od top 50 artistů (největší user-facing impact)