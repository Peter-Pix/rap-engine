#!/usr/bin/env python3
"""Krok 2.2.4 — doověří zbylé feat vazby titulem skladby."""
import json,os,re,unicodedata,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv

def norm(s):
    if s is None: return ""
    s=str(s).lower()
    s=unicodedata.normalize('NFD',s)
    s=''.join(ch for ch in s if unicodedata.category(ch)!='Mn')
    return re.sub(r'[^a-z0-9]','',s)

def load(a):
    try: return json.load(open(f"{ENT}/{a}/meta.json",encoding='utf-8'))
    except Exception: return None

fixed=0; left=[]
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    m=load(d)
    try: r=json.load(open(f"{ENT}/{d}/relations.json",encoding='utf-8'))
    except: continue
    if not r.get('featuring'): continue
    em=m.get('extraMeta') or {}
    if em.get('featVerifiedBy') not in (None,'deezer-contrib-partial'): continue
    t=norm(m.get('title',''))
    names=[]
    for f in r['featuring']:
        fm=load(f); names.append((fm or {}).get('title') or f.replace('artist_',''))
    ok=all(norm(n) in t for n in names)
    if ok:
        if WRITE:
            em['featVerifiedBy']='title'; m['extraMeta']=em
            json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
        fixed+=1
    else:
        left.append((m.get('title'),names))
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: ověřeno titulem={fixed} nedořešeno={len(left)}")
for x in left: print("  ",x)
