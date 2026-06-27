# Prompt pro sběr dat skladby (Track Entity)

## Úkol

Sežeň a ověř data pro jednu konkrétní skladbu českého/slovenského rapu. Výstupem musí být strukturovaná data připravená k importu do knowledge graphu 4rap.cz.

**Důležité pravidlo:** Žádný full text skladby. Nepiš celý lyrics, nekopíruj z Genius, neparafrázuješ celé verše. Cílem je **knowledge + metadata + interpretace** — ne lyrics databáze.

---

## 1. KONTEXT PROJEKTU

4rap.cz je knowledge graph české a slovenské rapové scény. Máme 1200+ entit (rapperi, alba, labely, lokality) propojených vazbami. Teď přidáváme **standalone track pages** — každá skladba = samostatná stránka s vlastním URL (`/skladby/[slug]`).

**Track page není lyrics stránka.** Je to:
- Metadata (rok, délka, producent, featuring, label)
- „O skladbě“ — co je téma, kontext vzniku, produkce, interpretace, dopad
- Propojení na další entity (interpret, album, producent, label, žánr, témata)

---

## 2. CO POTŘEBUJEME ZJISTIT

### A) Základní metadata (povinné)

| Pole | Co to je | Příklad |
|------|----------|---------|
| `title` | Název skladby | Syndrom |
| `slug` | URL-friendly ID | `yzomandias-syndrom` (formát: `interpret-slug-nazev-skladby`) |
| `id` | prefix + slug | `track_yzomandias-syndrom` |
| `artist` | Primární interpret | Yzomandias |
| `album` | Album, na kterém vyšla | Joker |
| `year` | Rok vydání | 2024 |
| `duration_sec` | Délka v sekundách (nepovinné) | 195 |
| `explicit` | Explicitní obsah? | true / false |
| `producer` | Jméno producenta/producentů | Viktor Sheen, NobodyListen |
| `featuring` | Hostující interpreti (pole) | Viktor Sheen, Nik Tendo |
| `label` | Label, pod kterým vyšla | Milion+ |
| `spotify_url` | Přímý link na Spotify | https://open.spotify.com/track/... |
| `youtube_url` | YouTube link | https://www.youtube.com/watch?v=... |

### B) „O skladbě“ — knowledge atomická struktura

Místo lyrics píšeme 5 atomických sekcí. Každá 2-5 vět. Konkrétní, ne obecné.

```
summary       → O čem skladba je (téma, vibe, core message)
context       → Kontext vzniku (období kariéry, album, proč vznikla)
production    → Produkce (beat, styl, zvuk, co dělá track unikátní)
interpretation→ Interpretace textu (metafory, storytelling, co se řeší, BEZ citátů)
impact        → Dopad (jaký měla na kariéru, scénu, recepce, streaming čísla pokud znáš)
```

### C) Taxonomie (propojení na existující entity)

| Typ | Co hledat | Příklady |
|-----|-----------|----------|
| `genres` | Žánry | trap, drill, melodic rap |
| `styles` | Hudební styly | dark, minimalist, aggressive |
| `themes` | Témata | drogy, úspěch, vztahy, introspekce, beef |
| `moods` | Nálady | temná, energická, melancholická |
| `related` | Související skladby nebo entity (pokud relevantní) | |

---

## 3. PŘÍKLAD VÝSTUPU (kompletní)

### `meta.json`

```json
{
  "id": "track_yzomandias-syndrom",
  "type": "track",
  "slug": "yzomandias-syndrom",
  "title": "Syndrom",
  "description": "Syndrom od Yzomandias je temný trap track o dvojí tváři úspěchu — glamour navenek a prázdnota uvnitř. Produkce Viktor Sheen a NobodyListen staví na minimalistickém beatu s melancholickým piano sample.",
  "publishedAt": "2024-06-15",
  "extraMeta": {
    "duration": 195,
    "explicit": true,
    "sources": [
      "https://open.spotify.com/track/xyz",
      "https://www.youtube.com/watch?v=xyz"
    ]
  }
}
```

### `relations.json`

```json
{
  "primaryArtist": ["artist_yzomandias"],
  "belongsToAlbum": ["album_joker"],
  "producers": ["artist_viktor-sheen", "artist_nobodylisten"],
  "featuring": ["artist_viktor-sheen", "artist_nik-tendo"],
  "labels": ["label_milion-plus"],
  "genres": ["genre_trap"],
  "styles": ["style_dark", "style_minimalist"],
  "themes": ["theme_success", "theme_introspection", "theme_duality"],
  "moods": ["mood_dark", "mood_melancholic"],
  "related": []
}
```

### `entity.mdx` (content — „O skladbě“)

```mdx
## O čem je

Syndrom zkoumá rozpor mezi veřejným image úspěšného rappera a soukromou realití. Yzomandias používá metaforu syndromu jako stavu, který postihuje každého kdo se pohybuje v prostředí, kde image je důležitější než realita.

## Kontext

Track vyšel na albu Joker (2024), které znamenalo návrat Yzomandias k temnějšímu zvuku po komerčnějším období. Spolupráce s Viktorem Sheenem a NobodyListen byla klíčová — oba producenti patří k nejužšímu okruhu Milion+ a jejich společná produkce definuje zvuk celého alba.

## Produkce

Beat je postavený na minimalistickém piano loopu s heavy 808 basovou linií. Produkce záměrně nechává prostor pro text — žádné přeplněné aranže, žádné zbytečné efekty. Tempo je pomalejší (okolo 75 BPM), což posiluje temný, téměř hypnotický vibe.

## Interpretace

Track strukturovaně staví kontrast mezi první a druhou slokou. Zatímco první část popisuje vnější úspěch (show, prachy, sláva), druhá sloka odhaluje psychickou cenu tohoto životního stylu. Refrén funguje jako mantra — opakované „mám syndrom“ se stává identitou, ne diagnózou.

## Dopad

Syndrom se stal jedním z nejvíce streamovaných tracků z alba Joker a často se objevuje v debatách o nejlepších skladbách Yzomandias. Track přitáhl pozornost kritiků právě pro svou autentičnost — na rozdíl od typického flex rapu zde Yzomandias ukazuje i slabé stránky.
```

---

## 4. OVĚŘOVACÍ POSTUP (kritické)

Před tím než cokoliv vrátíš, ověř:

1. **Existují cílové entity?** — Podívej se do databáze jestli artist/album/label už existuje. Pokud ne, potřebujeme stub nebo full entity.
2. **Duplicitní slug?** — Kontroluj jestli `slug` není už použitý jinou skladbou. Formát: `artist-slug-nazev-skladby` řeší většinu kolizí.
3. **Překlepy v názvech** — Ověř správné názvy interpretů, albumů, labelů. "Viktor Sheen" ≠ "Viktor Šín". "Milion+" ≠ "Milion Plus".
4. **Datum vydání** — Musí odpovídat realitě. Album + track year musí souhlasit.
5. **Producent vs featuring** — Producent = kdo dělal beat. Featuring = kdo rapuje na tracku. Nezaměňovat.
6. **Spotify URL** — Musí být přímý track link, ne album link.
7. **Žádné citace z textu** — Nepiš „jak říká ve druhé slokce: [citát]“. Místo toho „druhá sloka posouvá téma..."

---

## 5. FORMÁT ODPOVĚDI

Vrať výstup ve formátu:

```
=== meta.json ===
{...}

=== relations.json ===
{...}

=== entity.mdx ===
{...}

=== ověření ===
- [x] Všechny entity existují v databázi (nebo jsou označené jako NEW)
- [x] Slug je unikátní
- [x] Žádné citace z lyrics
- [x] Datum vydání ověřeno
- [x] Producent ≠ featuring
```

---

## 6. PRAVIDLA PAMATOVAT

- ❌ **NEPISUJ** celý text skladby
- ❌ **NEKOPÍRUJ** z Genius, AZLyrics, RapGenius
- ❌ **NEGENERUJ** pseudo-lyrics přepis
- ❌ **NEDÁVEJ** 1:1 citace z textu
- ❌ **NEVYTÁŘEJ** fiktivní data (streaming čísla, chart pozice — pokud nejsou ověřené)
- ✅ **PIŠ** strukturovanou interpretaci
- ✅ **PIŠ** kontext vzniku a dopad
- ✅ **OVĚŘUJ** existující entity proti databázi
- ✅ **PIŠ** konkrétně (ne „hodně lidí to poslouchalo“ ale „se stal jedním z nejstreamovanějších tracků z alba“)

---

## Tvoje skladba:

**[SEM DOPLŇ NÁZEV SKLADBY A INTERPRETA]**

Například: "Syndrom od Yzomandias" nebo "Ten Nikdo od Nik Tendo" nebo jiná skladba kterou chceš zpracovat.
