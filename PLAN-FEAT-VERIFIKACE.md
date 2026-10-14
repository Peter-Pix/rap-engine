# PLAN — Fáze 1.6: Ověření feat grafu (MBID jako autorita)

**Datum:** 14. 10. 2026
**Cíl:** Každá feat hrana má **strukturovaný důkaz**, ne jen jméno.
**Zásada:** Bezpečně, bez degradace dat. Nic nemazat, co nemá jednoznačný důkaz.

---

## Problém (proč to děláme)

Fáze 1.5 napojila 586 feat vazeb **matchingem podle jména** (text). Text má:
- **kolize** (3+ profily "Smack", víc reálných "Indy"/"Luisa"/"Magenta")
- **aliasy** ("Smack One" = Smack)
- **fake profily** (Smack 118822412 = 0 alb)
- **zahraniční jmenovce** (Hasan indonéský, James Cole house producent)

→ **Deezer ID se ukázal jako NESPOLEHLIVÝ** (má víc profilů na umělce).
→ **MusicBrainz MBID je nezávislá, strukturovaná autorita** (artist-credit na recording).

## Cíl (měřitelný)

| Metrika | Teď | Cíl |
|---|---|---|
| Feat vazby s ověřením | ~0 (jen jméno) | 100 % má `verification` + `source` |
| Feat vazby ověřené 2+ zdroji | ? | 300+ |
| Feat graf | 1 613 | 2 000+ (bez fake) |

## Fáze 1.6 — kroky

### 1.6.1 — MBID pro umělce (základ)
- Dohnat MBID pro všech 278 umělců (teď 127, chybí 151)
- Vyřešit 14 ambiguit ručně (SK/CZ varianta vs zahraniční)
- Uložit `mbid` do `meta.json` (jen jednoznačné)
- **Výstup:** 200+ umělců s MBID

### 1.6.2 — Title-based verifikace (bez API)
- Track, kde feat jméno **je v titulu** (816) → `verification: verified`, `source: title`
- Track, kde **není** (450) → kandidát na MB kontrolu
- **Bez rizika** — title je v datech, jenom se to zapíše

### 1.6.3 — MB ověření zbylých featů
- Pro 450 tracků bez feat v titulu: MB recording lookup
  - najdi recording → `artist-credit` = feat partneři
  - pokud MB potvrzuje → `verification: verified`, `source: musicbrainz`
  - pokud MB mlčí → `verification: unverified` (nechat vazbu, ale označit)
- **Pravidlo: NIKDY nemazat** — jen označit status. Mazání jen při prokazatelném rozporu (MB říká jiný umělec).

### 1.6.4 — Report + rozhodnutí
- Kolik feat vazeb má důkaz, kolik ne
- Které jsou podezřelé (MB rozpor) → ruční review s Peterem
- Teprve pak mazání (s explicitním OK)

## Bezpečnostní pravidla (anti-kruhy)

1. **Nic nemazat bez jednoznačného důkazu** (MB rozpor + potvrzení).
2. **Dry-run první**, pak `--write`.
3. **Záloha** `.backups/entities-before-<krok>-<datum>` před každým krokem.
4. **Po každém kroku:** 0 dangling + validace + testy.
5. **Neházet data, co nemají důkaz** — označit `unverified`, ne smazat.
6. **Když si nejsem jistý → STOP a zeptat se** (jako Smack One).
7. **Jeden commit na krok** — snadný rollback.
8. **Neopakovat stejný postup**, když selhal 2× (jiná cesta).

## Zdroje (priorita)

1. **MusicBrainz** — MBID, artist-credit (primární autorita)
2. **Title skladby** — feat jméno v názvu
3. **Discogs** — credits (terciární)
4. **Deezer** — JEN jako doplňkový, NIKDY pro mazání

## Odhad

| Krok | Čas | Riziko |
|---|---|---|
| 1.6.1 MBID backfill | 30–40 min | nízké |
| 1.6.2 title verifikace | 10 min | nulové |
| 1.6.3 MB ověření | 60–90 min | střední |
| 1.6.4 report | 20 min | nulové |
| **Celkem** | **~2,5 h** | |

## Co NEDĚLÁME

- ❌ Nepoužívat Deezer ID pro mazání (dokázaně nespolehlivé)
- ❌ Nezakládat nové entity (Petrův zákaz)
- ❌ Nemazat vazby bez MB rozporu
- ❌ Nepárovat entity podle volného textu
