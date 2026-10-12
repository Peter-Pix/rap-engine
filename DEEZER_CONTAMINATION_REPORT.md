# 🚨 Deezer kontaminace — report (12. 10. 2026)

## Co se stalo
`deezer-index.json` (postaven 2026-06-19, skript `scripts/deezer/build-index.ts`)
pároval naše alba na Deezer **podle JMÉNA** (fuzzy + exact title match).
Výsledek: **169 z 530 matchů (32 %) má ŠPATNÉHO interpreta.**

## Příklady
| Naše album | Náš rapper | Přiřazené Deezer album |
|-----------|-----------|------------------------|
| 0002 | Robin Zoot | **Foo Fighters** — 00020225 |
| 19 | Sofian Medjmedj | **Taylor Swift** — 1989 (Deluxe) |
| ok | Nerieš | **Radiohead** — OK Computer |
| rev | Dj Fatte | **The Beatles** — Revolver |
| bratr | Pil C | **Karel Kryl** — Bratříčku |
| 7 | Nik Tendo | **Lil Nas X** |
| 311 | Nerieš | **311** |
| antarktida | Sergei Barracuda | **Pokáč** |

## Dopad (před opravou)
- Špatné `genres` (rock/metal/pop místo rapu)
- Špatný `label`, `upc`, `releaseDate`, `trackCount`
- **31 alb** mělo `tracks.json` od cizího interpreta → špatné tracky
- **37 obalů** stažených z Deezeru = obaly cizích alb (Taylor Swift cover!)
- Špatný Deezer widget na stránce (přehrával cizí písničku)
- `publishedAt` (rok) — část mohla přijít z Deezeru

## Co je OPRAVENO (commit b83d9afea)
- Smazána Deezer-odvozená pole u 169 alb: `deezerId, deezerUrl, label, upc,
  genres, trackCount, durationSec, image, sourceUrls.deezer`
- Naše kurátorovaná data zachována: `title, description, year, publishedAt, relations`
- 31 `tracks.json` → `tracks.json.contaminated`
- 37 obalů → `.data/contaminated-covers/`
- Záloha: `.backups/pre-deezer-contamination-fix-20261012-122754.tar.gz`

## Stav teď
- 360 / 604 alb má ověřený `deezerId` (bylo 529)
- Zbylých 356 matchů **ověřeno** (přesná shoda title + interpret)
- 0 dangling vazeb, cache validní

## Co ZBÝVÁ (potřebuje rozhodnutí)
1. **Znovu spárovat 169 alb** se správným Deezer albem — BEZPEČNĚ:
   - Cesta A: přes **track → album.id** (track API vrací autoritativní album.id).
     Jen 12 alb má ale tracky s vlastním Deezer ID.
   - Cesta B: z 360 ověřených alb vytáhnout **Deezer artist ID** (album API →
     artist.id) → pak hledat naše album v **albech toho artisty** (ne globálně).
   - Cesta C: ruční whitelist (jako u fotek).
2. **Ověřit `publishedAt`/rok** u kontaminovaných alb (mohl přijít z Deezeru).
3. **Ověřit track-level Deezer URL** (`backfill-deezer-urls.ts` páruje podle názvu →
   i tracky můžou mít špatné URL).
4. Dořešit 131 stažených obalů (94 správných zbylo, 37 smazáno).

## Pravidlo do budoucna
**Deezer match POUZE přes jednoznačné ID** (artist_id/album_id/track_id).
Nikdy přes jméno/title. Před zápisem do DB vždy sanity-check (interpret musí sedět).
