#!/usr/bin/env python3
"""Krok 2.2.5 — odstraní VŠECHNY AI sekce z track MDX (Produkce/Interpretace/
Dopad/Témata a nálada) a přestaví MDX z faktů.

Předchozí strip-ai-essay-mdx.py odstranil jen '## O čem je', ale AI esej
měla i sekce 'Produkce', 'Interpretace', 'Dopad'.

Použití: python3 scripts/strip-all-ai-sections.py [--write]
"""
import json,os,sys,re,importlib.util
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
AI_SECS={'O čem je','Produkce','Interpretace','Dopad','Témata a nálada'}

spec=importlib.util.spec_from_file_location("rb",os.path.join(ROOT,"scripts","rebuild-track-mdx-v2.py"))
rb=importlib.util.module_from_spec(spec)
sys.argv=[a for a in sys.argv if a!='--write']
spec.loader.exec_module(rb)

changed=0; short=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    p=f"{ENT}/{d}/entity.mdx"
    if not os.path.isfile(p): continue
    c=open(p,encoding='utf-8').read()
    # detekuj AI sekce
    ai=any(re.search(r'^## '+re.escape(s)+r'\s*$', c, flags=re.M) for s in AI_SECS)
    if not ai: continue
    factual=rb.build_full(d, allow_ai=False)
    if len(factual)<400: short+=1
    if WRITE:
        open(p,'w',encoding='utf-8').write(factual)
    changed+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: AI sekce odstraněny={changed} z toho <400={short}")
