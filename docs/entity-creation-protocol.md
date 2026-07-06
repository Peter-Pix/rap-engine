# Protokol pro vytváření nových entit

## Zlaté pravidlo

> **Nikdy nevytvářej stub bez předchozího review seznamu.**

Ať už import pipeline, scraper, nebo manuální edit — vždycky nejdřív vygeneruj seznam toho, co se chystáš vytvořit, a projdi ho s humanem.

---

## Proč?

- Prevents duplikace (label ×3, artist se špatným slugem)
- Odhalí chybné mappingy dřív, než se propsanou do 100+ relations
- Šetří tokeny — oprava 1 entity před vznikem > mazání 50 stubů po importu

---

## Procedura (krok za krokem)

### Krok 1: Připrav seznam

Před jakýmkoliv bulk operací (import, batch create, enrich):

```bash
# Příklad: RapMonitor batch import
echo "=== Seznam entit k vytvoření ==="
npx tsx scripts/batch-import-tracks.ts --dry-run > planned-entities.txt

# Příklad: Noví artisté z Base44
echo "=== Seznam nových artistů ==="
npx tsx scripts/add-new-artists-from-base44.ts --dry-run > planned-artists.txt
```

Seznam musí obsahovat:
- **ID** (např. `label_blakkwood-records-bval`)
- **Typ** (label, artist, album, …)
- **Zdrojový název** (raw string z API / scraperu)
- **Proč se vytváří** (z jakého fieldu, jaký track/artist)

### Krok 2: Review seznamu

Pro každou položku se zeptej:

| Otázka | Proč |
|--------|------|
| **Už neexistuje podobná entita?** | Zabrání duplikacím |
| **Je slug správně?** | `label_blakkwood-records-bval` vs `label_blakkwood-records` |
| **Má entita smysl?** | Nebo je to artefakt z OCR / parse chyby? |
| **Je label/artist skutečně z české/Slovenské scény?** | Scope rule |

### Krok 3: Opravy před vytvořením

- Duplikát → přesměruj na existující canonical ID
- Špatný slug → oprav v import skriptu
- Artefakt → skip (nevytvářej)
- Nový label → přidej do `label-resolver.ts` aliasů

### Krok 4: Až pak vytvoř

```bash
# Až po schválení seznamu:
DRY_RUN=0 npx tsx scripts/batch-import-tracks.ts
```

### Krok 5: Ověř

```bash
# Po vytvoření:
npx tsx scripts/validate-content.ts
npx tsx scripts/build-content-cache.ts
```

---

## Šablona review seznamu

```markdown
## Review: Nové entity z [zdroj] — [datum]

### Labely (N nových)
| ID | Zdrojový název | Poznámka | Akce |
|----|----------------|----------|------|
| label_foo-records | "Foo Records" | Nový label | ✅ Vytvořit |
| label_blakkwood-bval | "Blakkwood Records Bval" | Vypadá jako duplikát | ❌ Přesměrovat na label_blakkwood-records |

### Artisté (N nových)
| ID | Zdrojový název | Město | Poznámka | Akce |
|----|----------------|-------|----------|------|
| artist_john-doe | "John Doe" | Praha | Nový | ✅ Vytvořit |

### Tracky (N nových)
| ID | Název | Album | Label | Poznámka |
|----|-------|-------|-------|----------|

---
**Schváleno:** [initials] — [datum]
```

---

## Kdy to použít

| Scénář | Povinné review? |
|--------|----------------|
| Batch import z RapMonitor | ✅ Ano |
| Noví artisté z Base44 | ✅ Ano |
| Manuální vytvoření entity | ✅ Ano (i jedné!) |
| Oprava existující entity | ❌ Ne (pokud nejde o novou entitu) |
| Rebuild cache | ❌ Ne (jen čte) |
| SEO indexation update | ❌ Ne (jen čte) |

---

## Červené vlajky (STOP a review)

- Seznam obsahuje > 15 nových entit → rozděl na menší batche
- Label se jmenuje podobně jako existující → ověř duplikaci
- Artist slug neodpovídá známému jménu → ověř diakritiku
- Víc než 2 nové labely v jednom batchi → suspect

---

## Integrace s label-resolverem

1. Před review spusť `resolveLabel()` na každý label v seznamu
2. Pokud vrátí null → buď nový label, nebo chybějící alias
3. Přidej alias do `label-resolver.ts` až PO schválení
4. Pak běž import

---

**Pamatuj:**
> Lepší 5 minut review než 2 hodiny mazání stubů.
