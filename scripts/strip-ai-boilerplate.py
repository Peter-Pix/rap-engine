#!/usr/bin/env python3
"""
Odstraní AI šablonu (vata) z karet interpretů, které mají NAD ní kvalitní
ověřený text se zdroji.

Kontext: dřívější hromadný import přilepil pod kvalitní ruční/ověřený profil
generickou šablonu (## Kariéra / ## V čem je unikátní / ## Vliv /
## Kontroverze / ## Superpower / ## Generační kontext) plnou vzletných frází
bez zdrojů. U některých karet si navíc protiřečí s ověřenými fakty
(např. Rytmus: AI blok tvrdí "z piešťanského sídliště", ale ověřená část
správně uvádí narození v Kroměříži).

Zachovává:
  - vše před začátkem AI bloku (ověřený text se zdroji)
  - ``### Zajímavosti`` (obsahuje konkrétní fakta, ne vatu)
  - ``## Klíčové tracky`` (strukturovaná data)
  - ``**Styly:**`` / ``**Témata:**`` (taxonomie)

Maže:
  - od prvního ``## Kariéra``/``## V čem je unikátní`` atd. ZA posledním
    výskytem ``Ověřená fakta``/``Poznámka k`` až po ``**Styly:**``

Suchý běh default, --write pro zápis.
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENT = ROOT / "content" / "entities"
WRITE = "--write" in sys.argv

GROUP_A = ["artist_rytmus","artist_maniak","artist_separ","artist_ben-cristovao",
"artist_nik-tendo","artist_arleta","artist_dj-fatte","artist_fobia-kid","artist_gleb",
"artist_hellwana","artist_james-cole","artist_kojo","artist_marpo","artist_mike-trafik",
"artist_pil-c","artist_rest"]

# AI blok začíná jedním z těchto nadpisů a končí před **Styly:**
AI_HEADS = r"^## (Kariéra|V čem je unikátní|Vliv|Kontroverze|Superpower|Generační kontext)\s*$"

changed = 0
for a in GROUP_A:
    p = ENT / a / "entity.mdx"
    if not p.exists():
        print(f"  !! {a} nemá entity.mdx"); continue
    t = p.read_text()
    lines = t.split("\n")

    # 1) najdi poslední "kotvu" kvalitního textu (Ověřená fakta / Poznámka k)
    anchor = None
    for i, l in enumerate(lines):
        if re.match(r"^#{2,3} .*Ověřená fakta", l) or "Poznámka k " in l \
           or re.match(r"^## Shrnutí jednou větou", l) \
           or re.match(r"^## Koho si pustit dál", l):
            anchor = i
    if anchor is None:
        print(f"  ?? {a}: kotva nenalezena — přeskakuji")
        continue

    # 2) najdi **Styly:** (konec AI bloku)
    styl = None
    for i, l in enumerate(lines):
        if l.startswith("**Styly:**"):
            styl = i; break
    if styl is None:
        print(f"  ?? {a}: **Styly:** nenalezeno — přeskakuji"); continue

    # 3) najdi PRVNÍ AI nadpis mezi anchor a styl
    start = None
    for i in range(anchor + 1, styl):
        if re.match(AI_HEADS, lines[i]):
            start = i; break
    if start is None:
        print(f"  -- {a}: AI blok nenalezen (možná už odstraněn)"); continue

    # 4) Zajímavosti jsou ZA **Styly:** (mimo AI blok) → nic se nezachraňuje.
    #    AI blok = od `start` až po `styl` (vyjma, pokud by uvnitř bylo ### Zajímavosti)
    keep_zaj = []
    new_lines = lines[:start] + keep_zaj + lines[styl:]
    # vyčisti vícenásobné prázdné řádky
    new_t = "\n".join(new_lines)
    new_t = re.sub(r"\n{3,}", "\n\n", new_t)

    removed = len(t) - len(new_t)
    changed += 1
    print(f"  {'DRY ' if not WRITE else 'WRT '} {a[7:]:22} -{removed:5}B  (zachováno Zajímavostí: {len(keep_zaj)} řádků)")
    if WRITE:
        p.write_text(new_t)

print(f"\n{'DRY-RUN' if not WRITE else 'ZAPSÁNO'}: {changed} karet")
