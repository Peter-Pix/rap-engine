# Preventivní opatření proti duplikátním labelům

## Problém

Import pipeliny (Base44, RapMonitor, 44rap) dostávají raw stringy jako:
- `"Blakkwood Records Bval"`
- `"Rychlí kluci / Warner Music"`
- `"Virgin Music / Universal Music Group"`
- `"Spirit Music Label / Independent"`

A vytváří nové entity pro každou variantu → stovky stubů.

## Řešení

### 1. Label Resolver (`src/lib/content/label-resolver.ts`)

**Jednotný bod pravdy** pro překlad raw label string → canonical ID.

```ts
import { resolveLabel } from "@/lib/content/label-resolver";

resolveLabel("Blakkwood Records Bval"); // → "label_blakkwood-records"
resolveLabel("Virgin Music / UMG");       // → "label_universal-music"
resolveLabel("Rychlí kluci");            // → "label_rychli-kluci"
resolveLabel("Neznámý label");           // → null (vytvoř nový)
```

**Jak to funguje:**
1. **Direct alias lookup** — hardcoded mapa známých variant
2. **Primary label extraction** — `"A / B / C"` → `"A"`
3. **Fuzzy match** — substring matching proti existujícím labelům
4. **Fallback** — vrátí `null`, volající může vytvořit nový

### 2. Pravidlo: Žádný nový import skript bez resolveru

Při vytváření nového import skriptu:

1. Importuj resolver:
```ts
import { resolveLabel } from "@/lib/content/label-resolver";
```

2. Nepoužívej `slugify(label)` ani `label_${slugify(label)}`.
3. Používej `resolveLabel(label)` a dostaň canonical ID.
4. Pokud `resolveLabel` vrátí `null`, buď:
   - Vytvoř nový label entity (pokud jde o nový legit label)
   - Nebo skip (pokud jde o artefakt / neznámou variantu)

### 3. Aktualizované skripty

| Skript | Status |
|--------|--------|
| `batch-import-tracks.ts` | ✅ Používá `resolveLabel` |
| `import-44rap-to-rkg.ts` | ✅ Používá `resolveLabel` |
| `add-missing-to-rkg.ts` | ✅ Používá `resolveLabel` |
| `add-new-artists-from-base44.ts` | ✅ Používá `resolveLabel` |

### 4. Jak přidat nový alias

Když objevíš novou duplikaci:

1. Najdi raw string, co vytvořil stub
2. Najdi existující canonical label ID
3. Přidej do `LABEL_ALIASES` v `src/lib/content/label-resolver.ts`:

```ts
"blakkwood records bval": "label_blakkwood-records",
```

4. Smaz stub entity
5. Oprav references v relations.json
6. Rebuild cache

### 5. Kontrolní seznam (checklist)

Před každým během import pipeline:

- [ ] Zkontroluj, že skript importuje `resolveLabel`
- [ ] Žádný `slugify()` na labely bez resolveru
- [ ] Po běhu zkontroluj logs na `created stub label_` warningy
- [ ] Prohoď diff `git diff --name-only content/entities/label_*` — žádný nový stub bez důvodu

### 6. Kdy se může duplikace objevit

| Případ | Řešení |
|--------|--------|
| Nový zdroj dat (RapMonitor, Base44) | Přidej aliasy do resolveru |
| Manuální editace | Vždy kontroluj `resolveLabel` |
| Merge z jiné branche | Diff labelů před merge |
| Script bez resolveru | Odmítnout PR / revert |

---

**Nejdůležitější pravidlo:**
> Label se nikdy nevytváří přímo z raw stringu. Vždycky jde přes `resolveLabel()`.
