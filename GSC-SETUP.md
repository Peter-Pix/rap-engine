# Google Search Console — Setup Guide

> Submitnout sitemap a začít sledovat indexaci.

## 1. Přidat property v GSC

1. Jdi na **https://search.google.com/search-console/welcome**
2. Vlevo vyber **"URL prefix"** (NE "Doména" — to vyžaduje DNS přístup)
3. Zadej:
   - Pro preview: `https://rap-engine.vercel.app` (nebo aktuální URL)
   - Pro produkci později: `https://4rap.cz` a `https://www.4rap.cz` (dvě property)
4. Klikni **Continue**

## 2. Vybrat verifikační metodu

Google nabídne víc způsobů. Doporučuji **HTML tag** (nejjednodušší pro Vercel):

1. Vyber **HTML tag**
2. Google ti ukáže meta tag jako:
   ```html
   <meta name="google-site-verification" content="ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890" />
   ```
3. **Zkopíruj jen tu hodnotu** z `content="..."` (bez uvozovek a meta tagu)
4. **NIC neklikej** ještě (Verify) — nejdřív musíme tag deploynout

## 3. Vložit token do Vercel ENV

V Vercel dashboardu:

1. Otevři projekt **rap-engine**
2. **Settings → Environment Variables**
3. Přidej novou variable:
   - Name: `NEXT_PUBLIC_GSC_VERIFICATION`
   - Value: `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890` (tvůj token z GSC)
   - Environment: ☑ Production ☑ Preview ☑ Development (zaškrtni všechny)
4. Save

## 4. Redeploy

```bash
# V terminálu (lokálně):
vercel deploy --prod
```

Nebo v Vercel dashboardu: **Deployments → tři tečky u nejnovějšího → Redeploy**.

Po redeployi otevři `https://rap-engine.vercel.app` v prohlížeči, View Source, a hledej:

```html
<meta name="google-site-verification" content="ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890" />
```

Mělo by to tam být.

## 5. Verify v GSC

1. Vrať se do Google Search Console (ten otevřený tab s ověřením)
2. Klikni **Verify**
3. Google by měl odpovědět ✅ Verified

## 6. Submit sitemap

1. V GSC v levém menu klikni **Sitemaps**
2. Pole "Add a new sitemap" zadej: `sitemap.xml`
3. Klikni **Submit**
4. Status by měl být **Success** a počet URL by se měl shodovat s tím, co GSC objeví

## 7. Co sledovat v dalších dnech/týdnech

GSC ti začne během několika dní postupně zobrazovat:

- **Coverage** — kolik stránek je indexovaných, jaké chyby tam jsou
- **Performance** — search queries, kliknutí, impressions, CTR, pozice
- **Sitemaps** — zda nově přidané URL Google zaregistroval
- **Core Web Vitals** — LCP, CLS, INP per URL
- **Rich Results** — jak Google čte naše Schema.org markup (MusicGroup, MusicAlbum, MusicRecording, BreadcrumbList, CollectionPage, ItemList, Article)

## 8. Bonus — Bing Webmaster Tools

Stejný princip, ale pro Bing: https://www.bing.com/webmasters

Bing taky drží malou část trafficu a dá se přihlásit přes GSC import — Bing si stáhne nastavení z GSC.

## 9. Bonus — Rich Results testing

Než počkáš na GSC, můžeš si rovnou ověřit Schema.org markup:

- **Rich Results Test**: https://search.google.com/test/rich-results
- Vlož URL: `https://rap-engine.vercel.app/raperi/yzomandias`
- Google ti řekne, jestli má MusicGroup, BreadcrumbList atd. validní

Nebo **Schema Markup Validator**: https://validator.schema.org/

## Troubleshooting

**Verify selhalo** — meta tag se ve View Source neukázal:
- Zkontroluj že ENV var je v Production environment v Vercel
- Zkontroluj že je to `NEXT_PUBLIC_GSC_VERIFICATION` (s prefixem `NEXT_PUBLIC_`, jinak Next.js to neexponuje na klientovi)
- Po změně ENV musíš znovu deploynout (ENV se aplikuje při buildu, ne za runtime)
- Hard refresh prohlížeč (Cmd+Shift+R / Ctrl+Shift+R)

**Sitemap "Couldn't fetch"**:
- Otevři `https://rap-engine.vercel.app/sitemap.xml` přímo v prohlížeči — měl by to být validní XML
- Pokud ne, něco shořelo v buildu

**Coverage chyby typu "Excluded by 'noindex' tag"**:
- Nemělo by se stát, robots.txt a meta robots máme správné

**Coverage "Crawled - currently not indexed"**:
- Normální stav prvních týdnů — Google si stránku stáhl, ale ještě neindexoval. Buď trpělivý.
