# Master Checklist: Doplnění profilů rapperů

> **Cíl:** Každý rapper, který má v `raw-data/taxonomy/{15profilu,9rappers,10}/` textový profil, musí mít tento profil kompletně v `content/entities/artist_*/entity.mdx`.

## Stav k 13. 6. 2026 02:00

**Problém:** Import scripty (`import-15-profiles.py` a žádný pro `9rappers`/`10`) buď usekly profil na první `***` sekci, nebo ho vůbec neimportovaly. V důsledku toho:
- **15 entit z 15profilu/**: v entity.mdx chybí 80–99 % textu (sekce za `***`: V kostce, Kariéra, V čem je unikátní)
- **19 entit z 9rappers/ + 10/**: profil nikdy neimportován (entity.mdx je buď stub, nebo chybí úplně)
- **3 entity** (`dj-fatte`, `koukr`, `fobia-kid`): chybí `realName` v meta.json, přestože je v `overena_data.txt` / profilu

## Postup pro každého rappera

Pro každého rappera v checklistu:

1. ✅ Přečíst `raw-data/taxonomy/{dir}/{Name}.txt` (celý profil)
2. ✅ Přečíst `content/entities/artist_{slug}/entity.mdx` (aktuální stav)
3. ✅ Přečíst `content/entities/artist_{slug}/meta.json` (metadata)
4. ✅ Porovnat s `raw-data/taxonomy/cesti_slovensti_rapperi_overena_data.txt` (ověřená fakta)
5. ✅ **Rozhodnutí**: 
   - Přidat chybějící sekce (V kostce, Kariéra, V čem je unikátní) za existující obsah
   - Doplnit chybějící meta (`realName`, `birthDate`, `origin`)
6. ✅ Ověřit, že `entity.mdx` po úpravě obsahuje **VŠECHNY** sekce profilu
7. ✅ Ověřit, že `meta.json` sedí s ověřenými daty
8. ✅ Zaškrtnout v checklistu

---

## Priorita A — 15profilu/ (15 rapperů, useknuté na první `***`)

| # | Slug | Profil | Raw KB | Ent B | RealName? | Stav |
|---|------|--------|--------|-------|-----------|------|
| 1 | `rytmus` | Rytmus.txt | 24.3 | **24276** | ✓ Patrik Vrbovský | ✅ |
| 2 | `ego` | Ego.txt | 23.2 | 1137 | ✓ Michal Straka | ✅ |
| 3 | `separ` | Separ.txt | 23.2 | 1114 | ✓ Michael Kmeť | ✅ |
| 4 | `marpo` | Marpo.txt | 24.0 | 858 | ✓ Otakar Petřina | ✅ |
| 5 | `orion` | Orion.txt | 24.6 | 1336 | ✓ Michal Opletal | ✅ |
| 6 | `ben-cristovao` | Ben Cristovao.txt | 28.0 | 1590 | ✓ Ben da Silva Cristóvão | ✅ |
| 7 | `gleb` | Gleb.txt | 25.4 | 1478 | ✓ Gleb Veselov | ✅ |
| 8 | `ptk` | PTK.txt | 25.0 | 1611 | ✓ Patrik Aišman | ✅ |
| 9 | `pil-c` | Pil C.txt | 21.2 | 1200 | ✓ Lukáš Kajanovič | ✅ |
| 10 | `fobia-kid` | Fobia Kid.txt | 24.4 | 1449 | **✗ missing** | ✅ |
| 11 | `fvck-kvlt` | Fvck_kvlt.txt | 23.0 | 1428 | ✓ Denis Bango | ✅ |
| 12 | `hellwana` | Hellwana.txt | 26.1 | 1471 | ✓ Monika Evans | ✅ |
| 13 | `mike-trafik` | Mike Trafik.txt | 24.1 | 1458 | ✓ Michal Řepka | ✅ |
| 14 | `arleta` | Arleta.txt | 28.5 | 1664 | ✓ Arleta Berndorff | ✅ |
| 15 | `vercetti-cg` | Vercetti CG.txt | 19.4 | 1515 | ✓ Dominik Vyšata | ✅ |

## Priorita B — 9rappers/ (9 rapperů, profil nikdy neimportován)

| # | Slug | Profil | Raw KB | Ent B | RealName? | Stav |
|---|------|--------|--------|-------|-----------|------|
| 16 | `blako` | Blako.txt | 18.2 | 3388 | ✓ Aleksander Chemeze Ojo | ⬜ |
| 17 | `hard-rico` | Hard Rico.txt | 17.5 | 2771 | ✓ Enrico Pešta | ⬜ |
| 18 | `hasan` | Hasan.txt | 18.4 | 3370 | ✓ Josef Andreas | ⬜ |
| 19 | `koky` | Koky.txt | 16.8 | 4174 | ✓ Martin Koky | ⬜ |
| 20 | `renne-dang` | Renne Dang.txt | 5.4 | 2441 | ✓ René Dang | ⬜ |
| 21 | `robin-zoot` | Robin Zoot.txt | 13.2 | 3289 | ✓ Robert Pouzar | ⬜ |
| 22 | `sensey` | Sensey.txt | 18.8 | 2998 | ✓ Jakub Šonka | ⬜ |
| 23 | `sofian-medjmedj` | Sofian Medjmedj.txt | 16.9 | 2804 | ✓ Sofiane Medjmedj | ⬜ |
| 24 | `stein27` | Stein27.txt | 11.8 | 2874 | ✓ Petr Adámek | ⬜ |

## Priorita B — 10/ (10 rapperů, profil nikdy neimportován)

| # | Slug | Profil | Raw KB | Ent B | RealName? | Stav |
|---|------|--------|--------|-------|-----------|------|
| 25 | `dj-fatte` | DJ Fatte.txt | 22.1 | 42 | **✗ missing** | ⬜ |
| 26 | `dorian` | Dorian.txt | 21.6 | 274 | ✓ David Albrecht | ⬜ |
| 27 | `grey256` | Grey256.txt | 22.2 | 2666 | ✓ Martin Albrecht | ⬜ |
| 28 | `idea` | Idea.txt | 24.5 | 414 | ✓ Josef Změlík | ⬜ |
| 29 | `james-cole` | James Cole.txt | 24.3 | 1510 | ✓ Pavel Vrba | ⬜ |
| 30 | `kojo` | KOJO.txt | 24.7 | 458 | ✓ William Mendonça Sac | ⬜ |
| 31 | `kato` | Kato.txt | 26.0 | 2015 | ✓ Adam Svatoš | ⬜ |
| 32 | `koukr` | Koukr.txt | 24.3 | 30 | **✗ missing** | ⬜ |
| 33 | `lboy-bsc` | Lboy BSC.txt | 27.4 | 0 (MISSING) | — | ⬜ |
| 34 | `rest` | Rest .txt | 19.6 | 353 | ✓ Adam Chlpík | ⬜ |

---

## Průběžné statistiky

| Kategorie | Celkem | Hotovo |
|-----------|--------|--------|
| Priorita A (15profilu) | 15 | **15 ✅** |
| Priorita B (9rappers) | 9 | **9 ✅** |
| Priorita B (10/) | 10 | **10 ✅** |
| **Celkem** | **34** | **34 ✅** |

## Stav k 13. 6. 2026 (14:30)

**HOTOVO ✅ — všech 34 entit má bohaté profily s plnými sekcemi.**

Dnešní session (13. 6.):
- **15profilu/ (15/15)** → dříve dnes, commity `a0e3f1e`–`0927eea`
- **10/ (10/10)** → 13:55–14:10, commity v rozsahu `63ceb5d`–`ae75231`
- **9rappers/ (9/9)** → 14:26–14:40, commit `03dc152`

## Poznámky k postupu

- **Sekce za `***`:** Všechny profily mají stejnou strukturu: úvod (1–2 odstavce) → `***` → "V kostce" (bullets) → `***` → "Kariéra: ..." (dlouhý text) → `***` → "V čem je unikátní" (1, 2, 3 atd.)
- **Markdown reference:** Profily mají inline citace `[\[zdroj.cz\]](url)`. Ty v importu byly **odstraněny** (`re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', first)`). Při doplňování je **nechávám** — jsou cenné pro ověřitelnost.
- **Kontrola meta:** `overena_data.txt` je autoritativní zdroj pro `realName`, `birthDate`, `origin`. Pokud se profil a overena_data liší, prioritu má overena_data.
- **entity.mdx formát:** Před úpravou zkontroluju, jestli to není stub (`<!-- Stub entity created on ... -->`). Pokud ano, **kompletně přepíšu** profilem. Pokud ne, **append** za stávající text.
