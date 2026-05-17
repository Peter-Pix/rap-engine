# RapEngine

> Knowledge graph české rapové scény. Propojená síť entit, automatické SEO, programmatic content.

## Architektura

```
src/
├── app/                    # Next.js App Router
│   ├── raperi/[slug]/      # Profily rapperů (SSG)
│   ├── alba/[slug]/        # Detail alba (SSG)
│   ├── labely/[slug]/      # Detail labelu (SSG)
│   ├── zanry/[slug]/       # Detail žánru (SSG)
│   ├── clanky/[slug]/      # Magazín (SSG)
│   ├── api/og/             # Edge OG image generator
│   ├── sitemap.ts          # Auto-sitemap
│   └── robots.ts           # Auto-robots.txt
├── lib/
│   ├── types.ts            # Entity typy
│   ├── schema.ts           # Schema.org generátor (MusicGroup, MusicAlbum, BreadcrumbList…)
│   ├── metadata.ts         # Dynamic Next.js Metadata
│   └── interlinking.ts     # Auto-interlinking engine
├── components/
│   ├── layout/             # Header, Footer
│   ├── entity/             # EntityCard, Breadcrumb, MDXRenderer
│   └── seo/                # JsonLd
content/
├── raperi/*.mdx            # Profily rapperů
├── alba/*.mdx              # Recenze alb
├── labely/*.mdx            # Labely
├── zanry/*.mdx             # Žánry
└── clanky/*.mdx            # Magazín
```

## Pravidla hry (Mantinely)

### MUSÍ
- **App Router only** — Server Components, Metadata API.
- **Contentlayer pro MDX** — oddělené `.mdx` a `.json` data.
- **SSG/ISR** — vše prerendrováno, žádný CSR pro indexovaný obsah.
- **Auto-metadata** — title, description, canonical, schema.org při buildu.
- **LCP < 2.5s** — žádné těžké klientské animace.

### NESMÍ
- Žádný CSR (Client-Side Rendering) pro content.
- Žádný generický AI spam.
- Žádné hardcoded odkazy mezi entitami.
- Žádné main-thread blocking animace.

## Vývoj

```bash
npm install --legacy-peer-deps
npm run dev      # contentlayer dev + next dev
npm run build    # contentlayer build + next build --webpack
npm run start
```

## Roadmap

- ✅ **Fáze 1** — Architektura, typy, Contentlayer, sitemap/robots
- ✅ **Fáze 2** — Entity systém (Rapper, Album, Label, Zanr, Clanek)
- 🟡 **Fáze 3** — Auto-interlinking v MDX, OG image generation, ComfyUI pipeline
- ⚪ **Fáze 4** — Programmatic SEO pages (`/zanry/uk-garage/raperi`), Supabase přechod

## Deploy

```bash
vercel
```

Doména: [4rap.cz](https://4rap.cz)
