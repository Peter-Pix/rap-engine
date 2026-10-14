#!/usr/bin/env python3
"""Krok 2.2 — rozšíření description tracků na 160+ znaků z FAKTŮ.

Description je signál s váhou 15 (160 znaků = full).
Popis se staví výhradně z faktů (interpret, album, rok, feat, žánr, label, délka).
NIKDY nezkrátí existující popis.

Použití: python3 scripts/enrich-track-descriptions.py [--write]
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv

def load(a,f="meta.json"):
    try: return json.load(open(f"{ENT}/{a}/{f}",encoding='utf-8'))
    except Exception: return None

def fmt(sec):
    if not sec: return None
    m,s=divmod(int(sec),60); return f"{m}:{s:02d}"

def build(aid):
    m=load(aid); r=load(aid,"relations.json") or {}
    if not m: return None
    em=m.get('extraMeta') or {}
    pa=r.get('primaryArtist') or []; al=r.get('belongsToAlbum') or []
    fe=r.get('featuring') or []; gs=r.get('genres') or []; ls=r.get('labels') or []
    if not pa: return None
    am=load(pa[0]) or {}
    pn=am.get('title',pa[0].replace('artist_',''))
    alb=load(al[0]) if al else None
    t=m.get('title','').strip()
    s=f"„{t}“ je skladba od {pn}"
    if alb:
        s+=f" z alba {alb.get('title')}"
        if alb.get('year'): s+=f" ({alb.get('year')})"
    s+="."
    extra=[]
    if fe:
        fn=[(load(f) or {}).get('title',f.replace('artist_','')) for f in fe]
        extra.append(f"Na skladbě hostuje {', '.join(fn)}.")
    if gs:
        gn=[(load(g) or {}).get('title',g.replace('genre_','')) for g in gs[:3]]
        extra.append(f"Žánrově spadá do {', '.join(gn)}.")
    if ls:
        ln=[(load(l) or {}).get('title',l.replace('label_','')) for l in ls[:2]]
        extra.append(f"Vydal label {', '.join(ln)}.")
    d=fmt(em.get('duration'))
    if d: extra.append(f"Délka skladby je {d}.")
    if alb and alb.get('year'):
        extra.append(f"Součást diskografie alba {alb.get('title')}.")
    if em.get('explicit') is True: extra.append("Skladba je označena jako explicitní.")
    return (s+" "+" ".join(extra)).strip()

changed=0; skipped=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    m=load(d)
    if not m: continue
    cur=m.get('description') or ''
    if len(cur)>=160: continue
    new=build(d)
    if not new or len(new)<=len(cur): skipped+=1; continue
    if WRITE:
        m['description']=new
        json.dump(m,open(f"{ENT}/{d}/meta.json",'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
    changed+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: rozšířeno={changed} přeskočeno={skipped}")
