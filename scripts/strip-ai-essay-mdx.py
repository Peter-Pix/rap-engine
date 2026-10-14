#!/usr/bin/env python3
"""Krok 2.2.1 — odstraní AI esej „## O čem je" z MDX tracků.

Nahradí faktickým obsahem (builder z 2.1b). Tracky, které pak nemají
≥400 znaků, dostanou noindex (správně — radši neindexovat než AI slop).

Použití: python3 scripts/strip-ai-essay-mdx.py [--write]
"""
import json,os,sys,re,importlib.util
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
sys.path.insert(0,os.path.join(ROOT,"scripts"))
WRITE="--write" in sys.argv
MIN=400

# import builderu z v2
spec=importlib.util.spec_from_file_location("rb",os.path.join(ROOT,"scripts","rebuild-track-mdx-v2.py"))
rb=importlib.util.module_from_spec(spec)
sys.argv=[a for a in sys.argv if a!='--write']
spec.loader.exec_module(rb)

def strip_ai(mdx):
    # odstraní sekci "## O čem je" (od nadpisu po další "## ")
    parts=re.split(r'(?=^## )', mdx, flags=re.M)
    keep=[p for p in parts if not p.startswith('## O čem je')]
    return "".join(keep).strip()

changed=0; short_after=0; gone_none=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    p=f"{ENT}/{d}/entity.mdx"
    if not os.path.isfile(p): continue
    cur=open(p,encoding='utf-8').read()
    if '## O čem je' not in cur: continue
    new=strip_ai(cur)
    # rebuild faktický (bez AI esejí) — přepíše celé MDX
    em=(rb.load(d) or {}).get('extraMeta') or {}
    use_ai=False  # už žádné AI sekce
    factual=rb.build_full(d, allow_ai=use_ai)
    # použij faktický, pokud je delší/stejný; jinak jen strip
    final = factual if len(factual)>=len(new) else new
    if len(final)<MIN: short_after+=1
    if WRITE:
        open(p,'w',encoding='utf-8').write(final)
    changed+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: AI esej odstraněna={changed} z toho <{MIN} znaků={short_after}")
if not WRITE:
    for d in sorted(os.listdir(ENT)):
        if not d.startswith('track_'): continue
        p=f"{ENT}/{d}/entity.mdx"
        if not os.path.isfile(p): continue
        c=open(p,encoding='utf-8').read()
        if '## O čem je' not in c: continue
        print("\n═══ "+d+f' ({len(c)} → nové) ═══')
        print(rb.build_full(d, allow_ai=False)[:500])
        break
