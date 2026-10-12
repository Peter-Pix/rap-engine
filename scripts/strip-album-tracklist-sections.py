#!/usr/bin/env python3
"""
strip-album-tracklist-sections.py — chirurgicky odstraní duplicitní seznamy
skladeb z MDX obsahu alb.

PROČ: Album stránka zobrazovala tracky DVAKRÁT:
  1. MDX `content` (sekce "## Skladby na albu" + "## Kde začít") — odkaz seznam
     bez délky a bez přehrávání.
  2. <Tracklist> komponenta (Deezer data: pořadí, délka, feat, přehrávání).
Cílem je ponechat JEN komponentu Tracklist.

Tento skript odstraní POUZE ty dvě sekce (a jejich obsah) z MDX. Zbytek
(Kontext, Čemu se album věnuje) zůstává netknutý.

Bezpečnost: DRY_RUN default (DRY=0 pro zápis), záloha do .backups/.
Idempotentní: když sekce není, soubor se nemění.
"""
import os, re, sys, shutil, json
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTITIES = os.path.join(ROOT, "content", "entities")
DRY = os.environ.get("DRY", "1") != "0"
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
BACKUP = os.path.join(ROOT, ".backups", f"strip-tracklist-{STAMP}")

# Sekce, které se odstraňují (nadpis + vše až do dalšího ## nebo konce)
SECTION_TITLES = ["Skladby na albu", "Kde začít"]

def strip_sections(body: str) -> tuple[str, int]:
    removed = 0
    for title in SECTION_TITLES:
        # Najdi nadpis "## <title>" a smaž až po další "## " (nebo konec)
        pat = re.compile(
            rf"^##\s+{re.escape(title)}\s*\n.*?(?=^##\s|\Z)",
            re.MULTILINE | re.DOTALL,
        )
        new, n = pat.subn("", body)
        if n:
            removed += n
            body = new
    # Zkonsoliduj vícenásobné prázdné řádky
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip() + "\n", removed

def split_frontmatter(raw: str) -> tuple[str, str]:
    m = re.match(r"^(\s*---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n)", raw)
    if m:
        return m.group(1), raw[m.end():]
    return "", raw

changed = []
skipped = 0
for name in sorted(os.listdir(ENTITIES)):
    if not name.startswith("album_"):
        continue
    p = os.path.join(ENTITIES, name, "entity.mdx")
    if not os.path.exists(p):
        continue
    raw = open(p, encoding="utf-8").read()
    fm, body = split_frontmatter(raw)
    new_body, removed = strip_sections(body)
    if removed == 0:
        skipped += 1
        continue
    changed.append((name, len(body), len(new_body), removed))
    if not DRY:
        os.makedirs(os.path.join(BACKUP, name), exist_ok=True)
        shutil.copy2(p, os.path.join(BACKUP, name, "entity.mdx"))
        open(p, "w", encoding="utf-8").write(fm + new_body)

print(f"Alba se sekcí k odstranění: {len(changed)} | bez změny: {skipped}")
if changed:
    print(f"Ø zkrácení: {sum(c[1]-c[2] for c in changed)//len(changed)} znaků")
    print("Vzorek:")
    for n, o, nw, r in changed[:8]:
        print(f"  {n:35} {o:6} → {nw:5} B ({r} sekcí)")
if DRY:
    print(f"\n[DRY-RUN] Nic nezapsáno. DRY=0 pro zápis (záloha → {BACKUP}).")
else:
    print(f"\n✅ Zapsáno. Záloha → {BACKUP}")
