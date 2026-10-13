#!/usr/bin/env python3
"""
Odstraní AI prózu v TĚLE textu (mimo sekce) — "Představ si, že bys...",
"Pravděpodobně by to znělo...", "Zvláštní je, že...".

Tyto odstavce nejsou pod AI nadpisem, takže je strip-ai-sections minul.

Použití: python3 scripts/strip-ai-prose.py [--write]
"""
import re, sys
from pathlib import Path
ENT = Path(__file__).resolve().parent.parent / "content" / "entities"
WRITE = "--write" in sys.argv

AI_PROSE = re.compile(
 r"^(Představ si|Pravděpodobně by|Zvláštní je, že|Vezmi si, že|Možná se ptáš|"
 r"To je přesně ono|A právě proto|Proto je|Není divu, že|Není náhodou, že|"
 r"Když se řekne|Vzpomeň si|A to je (důvod|přesně)|Právě proto)", re.I)

def clean(t):
    lines = t.split("\n")
    kill = set()
    for i, ln in enumerate(lines):
        s = ln.strip()
        if not s or s.startswith(("#","|","-","*",">","---")): continue
        if AI_PROSE.match(s):
            kill.add(i)
            # přilehlé pokračovací věty (krátké odstavce do 200 znaků, než narazíš na další)
    if not kill: return t, False
    kept=[ln for i,ln in enumerate(lines) if i not in kill]
    new="\n".join(kept)
    new=re.sub(r"\n{3,}","\n\n",new).strip()+"\n"
    return new, True

changed=[]
for d in sorted(ENT.iterdir()):
    if not d.name.startswith("artist_"): continue
    f=d/"entity.mdx"
    if not f.exists(): continue
    t=f.read_text(); new,ok=clean(t)
    if ok and new!=t:
        changed.append((d.name,len(t),len(new)))
        if WRITE: f.write_text(new)
print(f"{'ZAPSÁNO' if WRITE else 'DRY-RUN'}: {len(changed)}")
for n,a,b in changed[:30]: print(f"  {n[7:]:22} {a} → {b}")
