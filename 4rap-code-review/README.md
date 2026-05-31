# 4RAP — Code Review (výsledek)

Projel jsem celý nasazený kód (komponenty, pages, lib, config). **Jedna reálná
chyba, opravená.** Zbytek byl čistý.

## Co jsem kontroloval

| Kontrola | Výsledek |
|---|---|
| TypeScript (`tsc --noEmit`) | ✓ Clean (jen `baseUrl` deprecation warning — neškodný, preexistující) |
| Importy ↔ exporty napříč komponentami | ✓ Sedí (CategoryBadge, NewBadge, TagList, CategoryDotLabel, …) |
| Contentlayer kolekce (`allZanrs`, `allSkladbas`, `allClaneks`) | ✓ Sedí 1:1 s `documentTypes` |
| `'use client'` na interaktivních komponentách | ✓ Header, MobileHeaderButtons, FeedFilters, MobileMenu |
| Statické komponenty BEZ zbytečného `'use client'` | ✓ EntityCard, ListingHero, DetailHero, ArticleCard, FeaturedHero, CategoryBadge |
| `formatCzechDate({ short })` signatura | ✓ `opts?: { short?: boolean }` — volání sedí |
| `isRecent(iso, 14)` signatura | ✓ `(iso, withinDays = 14)` — volání sedí |
| Dead import `MobileMenu` v MagazineHeader | ✓ Správně přesunut do MobileHeaderButtons |
| `getWebSiteSchema` z `@/lib/schema` | ✓ Existuje |
| Unused imports / hooky | ✓ Žádné |

## Reálná chyba: CSS duplicity ⚠ → ✓ OPRAVENO

`globals.css` měl **3× nakupené stejné CSS bloky** — vznikly tím, jak jsme postupně
appendovali v2.1 + v2.2 + v2.3 hotfixy přes `cat magazine-vX.css >> globals.css`.

```
.mh-desktop      → 3× definováno
MAGAZINE V2 blok → 4× (V2, V2.1, V2.2, V2.3)
Celkem           → 596 řádků
```

**Proč to vadí:** mezi verzemi se některá pravidla měnila (např. `.rap-prose`
font-size, hero typografie). Když máš 3 verze nakupené, pozdější přepisuje dřívější —
většinou to funguje, ale je to křehké a může to dělat záhadné "proč se to nemění"
problémy při dalších úpravách.

**Oprava:** Nechal jsem tvůj původní `globals.css` (řádky 1–111: `.entity-link`,
`.glass`, `.rap-prose`, `.magazine-display`, `:root` proměnné) + jen **finální V2.3
blok** (který je self-contained — obsahuje všechny `.mh-*`, `.cz-display`,
`.text-balance`, `.scrollbar-none`, `.line-clamp`, mobile prose tweaks).

```
596 řádků → 244 řádků
4 MAGAZINE bloky → 1
.mh-desktop 3× → 1×
```

### Nasazení opravy

V balíku je vyčištěný `globals.css`. Nahraď ním ten svůj:

```bash
cp 4rap-code-review/globals.css src/app/globals.css
```

⚠ **Než to uděláš:** Tenhle soubor vychází z verze v mém testovacím repu, který má
tvůj **původní** `globals.css` (1–111) z v7 zipu. Pokud jsi od té doby přidal vlastní
CSS pravidla přímo do `globals.css` (mimo moje appendované bloky), **zkontroluj diff**
před přepsáním:

```bash
diff <(sed -n '1,111p' src/app/globals.css) <(sed -n '1,111p' 4rap-code-review/globals.css)
```

Pokud diff nic nevrátí (nebo jen drobnosti), klidně přepiš. Pokud máš vlastní úpravy
v horní části, ruční cesta:

```bash
# Najdi, kde začíná první můj blok:
grep -n "MAGAZINE V2 " src/app/globals.css   # typicky ~řádek 112

# Smaž všechno od toho řádku dolů, pak append jen finální V2.3:
# (nahraď 112 reálným číslem)
sed -i '112,$d' src/app/globals.css
# pak append finální blok z mého souboru (řádky 113+ obsahují V2.3):
sed -n '113,$p' 4rap-code-review/globals.css >> src/app/globals.css
```

## Závěr

Kód je connection-ready. Po nahrazení `globals.css` doporučuju u sebe:

```bash
rm -rf .contentlayer .next
npm run build      # plný build chytne i to, co tsc/já nemůžu (node_modules nejsou v subsetu)
```

Pokud build projde, jsi clean. Kdyby build hodil něco neočekávaného, pošli mi výstup
a dořešíme — ale podle statické analýzy by mělo všechno sednout.
