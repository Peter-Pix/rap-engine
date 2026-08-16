# 4rap.cz — Mapa české rapové scény

Operační systém pro českou rapovou scénu. Strukturovaná znalostní databáze interpretů, alb, skladeb a lokací propojených do prohledávatelného grafu.

## Co to dělá

- **Entity graf** — 1600+ entit (interpreti, alba, skladby, producenti, labely, kolektivy, lokality, akce) propojených tisíci vazbami
- **Prohledávání** — fulltextové hledání napříč všemi entitami (`/hledat`)
- **Věcné pohledy** — autori, raperi, alba, skladby, producenti, labely, kolektivy, lokality, akce, scény
- **Taxonomie** — žánry, styly, témata, nálady
- **Mapa** (`/mapa`) — vizualizace celé sítě vazeb
- **SEO** — generované sitemapy, OG image, strukturovaná data

## Tech stack

- Next.js (App Router)
- React + TypeScript
- MDX obsah
- Build cache pipeline (`.content-cache/`): entities.json, graph.json, search-index.json, routes.json, graph-layout.json

## Spuštění

```bash
npm install
npm run dev
```

## Build cache

```bash
npm run cache:build           # rebuild entit a grafu
npm run cache:graph-layout    # layout grafu
npm run cache:validate        # validace konzistence
```

## Workflow (1 rapper = 1 commit)

Každá nová entita/stránka prochází MDX + meta + relations, pak se aktualizuje build cache (`feat: <artist> — <summary>`). Working tree se nikdy nenechává dlouho dirty, aby cache zůstala konzistentní s diskem.
