#!/usr/bin/env python3
"""Krok 2.1 — obohacení stub tracků (fakta, ne AI).

Stub tracky (4918) mají isStub+noindex → vyloučené z indexace, i když mají
99% album+artist+sources a 92% duration. Popis je krátká šablona.

Akce:
1. Popis rozšířit z FAKTŮ (interpret, album, rok, feat, délka) — ne AI slop
2. Odstranit isStub + noindex, pokud má track dost dat (artist + album + duration)

Použití: python3 scripts/enrich-stub-tracks.py [--write]
"""
import json,os,sys,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv

def load(aid,f="meta.json"):
    try: return json.load(open(f"{ENT}/{aid}/{f}"))
    except Exception: return None

def fmt_dur(sec):
    if not sec: return None
    m,s=divmod(int(sec),60); return f"{m}:{s:02d}"

enriched=0; unblocked=0; skipped=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    m=load(d)
    if not m: continue
    em=m.get('extraMeta') or {}
    if not em.get('isStub'): continue
    r=load(d,"relations.json") or {}
    pa=r.get('primaryArtist') or []
    al=r.get('belongsToAlbum') or []
    fe=r.get('featuring') or []
    if not (pa and al and em.get('duration')):
        skipped+=1; continue
    # jména
    pname=load(pa[0]) .get('title') if load(pa[0]) else pa[0].replace('artist_','')
    aname=load(al[0]).get('title') if load(al[0]) else None
    ayear=(load(al[0]) or {}).get('year')
    fnames=[ (load(f) or {}).get('title') for f in fe ]
    fnames=[x for x in fnames if x]
    # popis z faktů
    dur=fmt_dur(em.get('duration'))
    head=f"„{m.get('title')}“ je skladba od {pname}"
    if aname: head+=f" z alba {aname}" + (f" ({ayear})" if ayear else "")
    parts=[head]
    if fnames: parts.append("Hosté: " + ", ".join(fnames))
    if dur: parts.append(f"Délka {dur}")
    desc=". ".join(parts)+"." 
    if WRITE:
        m['description']=desc
        for k in ('isStub','noindex','stubReason','draftReason'):
            em.pop(k,None)
        m['extraMeta']=em
        json.dump(m,open(f"{ENT}/{d}/meta.json",'w'),indent=2,ensure_ascii=False); open(f"{ENT}/{d}/meta.json",'a').write('\n')
    enriched+=1; unblocked+=1

print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: obohaceno={enriched} přeskočeno={skipped}")
if not WRITE:
    # vzorek
    n=0
    for d in sorted(os.listdir(ENT)):
        if not d.startswith('track_'): continue
        m=load(d)
        if not m or not (m.get('extraMeta') or {}).get('isStub'): continue
        r=load(d,"relations.json") or {}
        if not (r.get('primaryArtist') and r.get('belongsToAlbum')): continue
        pa=r['primaryArtist'][0]; al=r['belongsToAlbum'][0]
        pn=(load(pa) or {}).get('title',pa); an=(load(al) or {}).get('title',al)
        em=m['extraMeta']
        parts=[f'„{m.get("title")}“ je skladba od {pn}']
        if an: parts.append(f'z alba {an}')
        print('  '+'. '.join(parts)+'.')
        n+=1
        if n>=5: break
