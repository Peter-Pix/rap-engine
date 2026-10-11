# Plán P1 — Import chybějících RM skladeb (bez feat) | 2026-10-11

## Problém (ověřený)
`generate-rm-feat-tracks.ts` filtruje `if (!s.feats?.length) continue;` → generuje
**jen skladby s feat hostem**. Sólovky z RM se nikdy neimportovaly.

**Konkrétní důkaz:** SHIMMI má v RM 20 unikátních skladeb (19 s AI analýzou), ale v naší
DB **0 tracků**. SHIMMI entity (artista) existuje.

## Rozsah P1 (ne celý RM — nejdřív validace pipeline)
Import **jednoho interpreta (SHIMMI)** jako pilot. Ověří celý řetězec:
RM záznam → track entita (meta + relations + MDX) → cache → build → stránka.

Teprve po validaci škálovat na všechny interprety s chybějícími sólovkami.

## Bezpečnostní kontroly (proti chybám)
1. **RM duplikáty** — RM má pro každou skladbu 2 záznamy (`complete` + `pending`).
   → Vždy vzít ten s `ai_analysis`/`lyrics_text`; pending ignorovat.
2. **Slug kolize** — `Otázky` (SHIMMI) vs `track_lipo-otazky`.
   → Slug VŽDY `track_<artistSlug>-<titleSlug>`. Nikdy jen podle titulu.
3. **Chybějící album/rok** — RM SHIMMI záznamy nemají album. → Nevymýšlet.
   Track zůstane bez `belongsToAlbum` (390 existujících tracků je taky bez).
4. **Featuring** — `featuring_names: []`, ale ověřit feat i v titulu (regex).
5. **Idempotence** — pokud `track_shimmi-<slug>` existuje, přeskočit.
6. **DRY_RUN default** — zápis jen s `DRY_RUN=0`.
7. **Git commit před zápisem** — rollback = `git reset --hard`.

## Obsah tracku (zdroj: RM, převzato strukturovaně, NE 1:1)
`entity.mdx` — 5 sekcí (O čem je / Kontext / Produkce / Interpretace / Dopad):
- **O čem je** ← `ai_summary_long` + `ai_main_idea`
- **Kontext** ← metadata (rok, label — pokud jsou), `ai_message`
- **Produkce** ← `ai_atmosphere` + `tags_style`/`tags_genre`
- **Interpretace** ← `ai_analysis` + `ai_motifs`
- **Dopad** ← `ai_analysis_recommendation` + `ai_analysis_rating`

`meta.json`:
- `description` ← `ai_summary_short` (zkrácený na ~160 znaků)
- `extraMeta`: `generatedFrom: "rap-monitor"`, `phase3Done: true`, `phase3Pas: "A"`,
  `themes` ← `ai_motifs`, `moods` ← `ai_emotions`, `spotifyUrl`, `youtubeUrl`
- **`noindex` se NESUNDÁ automaticky** — až po kvalitativním filtru.

`relations.json`:
- `primaryArtist: ["artist_shimmi"]`, `featuring` ← z titulu (většinou []), ostatní [].

## Kvalitativní filtr (kdy sundat noindex)
- Obsah ≥ 400 znaků, ≥ 3/5 sekcí vyplněno
- Hedge ratio < 30 % (`pravděpodobně|možná|nelze|neznámý`)
- Žádné zakázané fráze (`nelze určit`, `nejsou dostupné informace`)
- Deduplikace — stejný text na 2+ skladbách = template → neprojde

## Kroky provedení
1. Napsat `scripts/import-rm-solo-tracks.ts` (obecný, ne SHIMMI-only; `RM_ARTIST` filtr).
2. DRY_RUN běh → zkontrolovat výstup (kolik kandidátů, jaké slugy, jaký obsah).
3. Git commit (čistý stav před zápisem).
4. `DRY_RUN=0` + `RM_ARTIST=SHIMMI` → zápis 19 entit.
5. `npm run cache:build` → ověřit entity/hrany.
6. Kvalitativní filtr → sundat noindex u kvalitních.
7. Build + E2E.
8. **Rozhodnutí o škálování na ostatní interprety** (až po validaci).

## Co NEDĚLAT
- ❌ Nekopírovat RM analýzu 1:1 (autorská práva) — parafrázovat do 5 sekcí.
- ❌ Nevymýšlet album/rok/producenta, když v RM nejsou.
- ❌ Neimportovat všech 3 090 RM skladeb najednou.

## Otevřená otázka k rozhodnutí uživatele
Import sólovek z RM = potenciálně **velký objem** (RM má 3 090 skladeb, my 4 473;
část jsou sólovky bez feat, co chybí). Pilot na SHIMMI ověří pipeline, pak se
rozhodne o škálování.
