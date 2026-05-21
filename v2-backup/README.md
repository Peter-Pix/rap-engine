# RapEngine

> Knowledge graph české rapové scény. Next.js App Router + Contentlayer + SSG.

## Architektura

Striktně **entitní systém** — každá URL = jedna entita s vlastním Schema.org markup, dynamickou metadata a auto-interlinkováním.

### Entity types

| Cesta | Entity | Schema.org type |
|-------|--------|-----------------|
| `/raperi/[slug]` | Rappeři | `MusicGroup` |
| `/alba/[slug]` | Alba | `MusicAlbum` |
| `/labely/[slug]` | Labely | `Organization` + `MusicRecordLabel` |
| `/zanry/[slug]` | Žánry | `WebPage` |
| `/clanky/[slug]` | Články | `Article` |

### Tech stack

- **Next.js 16** App Router (SSG/ISR)
- **Contentlayer2** — type-safe MDX content
- **Tailwind CSS** v4
- **TypeScript** strict mode
- **Edge runtime** OG images
- **Auto-generated** sitemap.xml + robots.txt

## Pravidla

### Co MUSÍ
- Vše indexovatelné je předgenerované (SSG)
- Každá URL má unikátní `title`, `description`, `canonical`, schema markup
- Odkazy mezi entitami jsou generované programaticky
- LCP < 2.5s

### Co NESMÍ
- Client-Side Rendering pro obsah
- Generický AI spam bez insights
- Hardcoded odkazy
- Těžké klientské animace

## Vývoj

```bash
npm install
npm run dev       # contentlayer dev + next dev
npm run build     # contentlayer build + next build
npm run start     # production server
```

## Content struktura

```
content/
├── raperi/*.mdx       # MusicGroup entity
├── alba/*.mdx         # MusicAlbum entity
├── labely/*.mdx       # MusicRecordLabel entity
├── zanry/*.mdx        # WebPage entity
└── clanky/*.mdx       # Article entity
```

Každý MDX má strukturovaný frontmatter (validovaný Contentlayer) a tělo s automaticky linkovanými entity zmínkami.

## Auto-interlinking

`src/lib/interlinking.ts` obsahuje registry entit. Při buildu se každá zmínka entity (např. "Gleb") automaticky propíše jako `<a href="/raperi/gleb">Gleb</a>`.

## SEO

- ✅ Schema.org per entity
- ✅ Dynamic OG images (`/api/og?title=...&type=rapper`)
- ✅ Sitemap auto-generated
- ✅ Robots.txt
- ✅ Canonical URLs absolutní

## Deploy

Auto-deploy na Vercel z main branche.

---
🎯 **Cíl:** Ultimátní propojená databáze české rapové scény.
