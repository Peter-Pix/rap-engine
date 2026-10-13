#!/usr/bin/env python3
"""
Odstraní AI taglines (blokquote hodnotící věty typu "X je jedna z mála postav...").

Nechává: metadata blokquote (`> **Pozice:**`, `> [!NOTE]`, `> **Vlastní jméno:**`)
a poznámky k nejistotám (`**Poznámka k ...**`, `**Nejasnosti ve zdrojích:**`).

Smaže: hodnotící jednověté "moudrosti" bez faktické hodnoty.

Použití: python3 scripts/strip-ai-taglines.py [--write]
"""
import re, sys
from pathlib import Path
ENT = Path(__file__).resolve().parent.parent / "content" / "entities"
WRITE = "--write" in sys.argv

# Vzory AI tagline (hodnotící sloh)
AI_TAG = re.compile(
 r"(je (jed(na|en)|ten typ|z těch|jedním z (mála|těch)|jedna z (mála|nej))|"
 r"nepatří mezi|není (jen|prostě|typick)|dokázal|umí být|"
 r"stočil|posunul|přepsal|překročil|zůstává|představuje|"
 r"je (symbióz|most|architekt|zjevení)|"
 r"v českém rapu (je|patří)|v česko-slovenském rapu|"
 r"je jedním z nej|patří k nej|stojí za|"
 r"nepotřebuje|nemusí|nejde přehlédnout|nedá přehlédnout)", re.I)

def is_metadata(s):
    return s.startswith(("**Pozice","**Země","**Region","[!NOTE","**Město","**Role",
        "**Narozen","**Vlastní jméno","**Jméno","**Label","**Národnost","**Aktivní",
        "**Datum","**Roky","**Skupina","**Člen","**Poznámka:","**Poznámka k ",
        "**Nejasnosti ve zdrojích:","**Ovšem","**Alias","**Přezdívka","**Původ",
        "**Vydavatel","**Web","**Aktivita"))

def clean(t):
    lines = t.split("\n")
    kill = set()
    for i, ln in enumerate(lines):
        m = re.match(r"^>\s+(.+)$", ln)
        if not m: continue
        s = m.group(1).strip()
        if is_metadata(s): continue
        # AI tagline = dlouhá hodnotící věta (i se zdroji)
        if len(s) >= 90 and AI_TAG.search(s):
            kill.add(i)
            # přilehlé prázdné řádky
    if not kill: return t, False
    kept = [ln for i,ln in enumerate(lines) if i not in kill]
    new = "\n".join(kept)
    new = re.sub(r"\n{3,}", "\n\n", new).strip()+"\n"
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
print(f"{'ZAPSÁNO' if WRITE else 'DRY-RUN'}: {len(changed)} karet")
for n,a,b in changed[:30]: print(f"  {n[7:]:22} {a} → {b}")
