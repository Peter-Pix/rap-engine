#!/usr/bin/env python3
"""
Přeformuluje redakční poznámky v MDX z první osoby (AI hlas) do neutrálního,
lidského tónu.

Problém: "Poznámka k nejistotám" bloky psané v 1. osobě ("nepodařilo se mi
zjistit", "držel jsem se", "v profilu záměrně neuvádím") jsou AI redakční
hlas. Na veřejném webu nemá návštěvník číst, jak si redakce dělala rešerši.

Fix: neutrální formulace ("Zdroje se rozcházejí", "údaj není spolehlivě
doložen", "uvádíme jen to, co zdroje potvrzují").

Suchý běh default, --write pro zápis.
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENT = ROOT / "content" / "entities"
WRITE = "--write" in sys.argv

# (regex, náhrada) — aplikuje se na celý text MDX
RULES = [
    (r"ne?podařilo se mi (?:z dostupných (?:důvěryhodných )?zdrojů )?spolehlivě ověřit",
     "údaj není spolehlivě doložen"),
    (r"nepodařilo se mi (?:dohledat|ověřit|zjistit)", "údaj se nepodařilo dohledat"),
    (r"nenašel jsem dost čistě a spolehlivě doložené informace o",
     "informace o"),
    (r"proto je v profilu záměrně neuvádím", "proto je neuvádíme"),
    (r"proto jsem v profilu kladl důraz hlavně na", "proto se soustředíme na"),
    (r"proto jsem v textu zachoval opatrnou formulaci, že",
     "proto uvádíme opatrně, že"),
    (r"Proto to v profilu nijak nepřekrucuji a držím se přesné formulace ze zdrojů\.",
     "Proto uvádíme jen to, co zdroje spolehlivě potvrzují."),
    (r"držel jsem se (?:radši|hlavně) (?:pevných|toho)", "opíráme se o"),
    (r"jsem se držel (?:hlavně|radši)", "opíráme se o"),
    (r"proto je záměrně neuvádím", "proto je neuvádíme"),
    (r"v profilu pracuji opatrně s formulací", "uvádíme opatrně"),
    (r"uvádím jen informace, na kterých se dostupné zdroje shodují",
     "uvádíme jen to, co zdroje potvrzují"),
    (r"nijak nepřekrucuji", "nijak neupravujeme"),
    (r"jsem v profilu", "jsme na profilu"),
]

changed = 0
for d in sorted(ENT.iterdir()):
    p = d / "entity.mdx"
    if not p.exists(): continue
    t = p.read_text()
    if "Poznámka k nejistotám" not in t and "Poznámka k " not in t:
        continue
    orig = t
    for rx, repl in RULES:
        t = re.sub(rx, repl, t)
    if t != orig:
        # kolik pravidel zabralo
        n = sum(1 for rx, _ in RULES if re.search(rx, orig))
        changed += 1
        print(f"  {'DRY ' if not WRITE else 'WRT '} {d.name[7:]:24} {n} pravidel")
        if WRITE: p.write_text(t)

print(f"\n{'DRY-RUN' if not WRITE else 'ZAPSÁNO'}: {changed} karet")
