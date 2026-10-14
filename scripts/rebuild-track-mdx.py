#!/usr/bin/env python3
"""Krok 2.1A/2.1B — přestavba MDX tracků (stub + AI slop) z FAKTŮ.

- Stub MDX (<200 znaků) → faktická šablona (album, rok, délka, hosté, žánr, label, odkazy)
- AI slop (pravděpodobně/zřejmě/nejspíš) → nahradit faktickým obsahem

NIKDY negeneruje AI text — jen skládá fakta z meta.json + relations.json.

Použití: python3 scripts/rebuild-track-mdx.py [--write] [--only-slop]
"""
import json,os,sys,re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
ONLY_SLOP="--only-slop" in sys.argv

SLOP=re.compile(r'pravděpodobně|pravdepodobne|zřejmě|nejspíš|zdá se|může být|odhaduje|předpokládá',re.I)

def load(a,f="meta.json"):
    try: return json.load(open(f"{ENT}/{a}/{f}",encoding='utf-8'))
    except Exception: return None

def fmt_dur(sec):
    if not sec: return None
    m,s=divmod(int(sec),60); return f"{m}:{s:02d}"

def build(aid):
    m=load(aid); r=load(aid,"relations.json") or {}
    if not m: return None
    em=m.get('extraMeta') or {}
    pa=r.get('primaryArtist') or []
    al=r.get('belongsToAlbum') or []
    fe=r.get('featuring') or []
    gs=r.get('genres') or []
    ls=r.get('labels') or []
    title=m.get('title','').strip()
    if not pa: return None
    am=load(pa[0]) or {}
    pname=am.get('title',pa[0].replace('artist_',''))
    alb=load(al[0]) if al else None
    lines=[f"## O skladbě","",f"„{title}“ je skladba od [{pname}](/raperi/{am.get('slug','')})" + (f", vyšla na albu [{alb.get('title')}](/alba/{alb.get('slug','')})" + (f" ({alb.get('year')})" if alb.get('year') else "") if alb else "") + ".",""]
    # fakta tabulka
    facts=[]
    if alb: facts.append(f"**Album:** {alb.get('title')}" + (f" ({alb.get('year')})" if alb.get('year') else ""))
    d=fmt_dur(em.get('duration'))
    if d: facts.append(f"**Délka:** {d}")
    if fe:
        fn=[ (load(f) or {}).get('title',f.replace('artist_','')) for f in fe ]
        facts.append("**Hosté:** " + ", ".join(fn))
    if gs:
        gn=[ (load(g) or {}).get('title',g.replace('genre_','')) for g in gs[:3] ]
        facts.append("**Žánr:** " + ", ".join(gn))
    if ls:
        ln=[ (load(l) or {}).get('title',l.replace('label_','')) for l in ls[:2] ]
        facts.append("**Label:** " + ", ".join(ln))
    if em.get('isrc'): facts.append(f"**ISRC:** {em['isrc']}")
    if facts:
        lines+= ["## Fakta",""]+[f"- {f}" for f in facts]+[""]
    # odkazy
    srcs=[s for s in (em.get('sources') or []) if isinstance(s,str) and s.startswith('http')]
    if srcs:
        lines+=["## Poslechnout",""]
        names={'deezer':'Deezer','youtube':'YouTube','spotify':'Spotify','musicbrainz':'MusicBrainz'}
        for s in srcs[:4]:
            dom=next((v for k,v in names.items() if k in s),'Odkaz')
            lines.append(f"- [{dom}]({s})")
        lines.append("")
    return "\n".join(lines)

rebuilt=0; slop_fixed=0; skipped=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    p=f"{ENT}/{d}/entity.mdx"
    if not os.path.isfile(p): continue
    try: cur=open(p,encoding='utf-8').read()
    except: continue
    is_stub=len(cur)<200
    is_slop=bool(SLOP.search(cur))
    if ONLY_SLOP and not is_slop: continue
    if not is_stub and not is_slop: continue
    new=build(d)
    if not new or len(new)<120: skipped+=1; continue
    if WRITE:
        open(p,'w',encoding='utf-8').write(new)
        if is_slop: slop_fixed+=1
        else: rebuilt+=1
    else:
        if is_slop: slop_fixed+=1
        else: rebuilt+=1

print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: stub přestavěno={rebuilt} slop opraveno={slop_fixed} přeskočeno={skipped}")
if not WRITE:
    # vzorek
    for d in sorted(os.listdir(ENT)):
        if not d.startswith('track_'): continue
        p=f"{ENT}/{d}/entity.mdx"
        if not os.path.isfile(p): continue
        cur=open(p,encoding='utf-8').read()
        if len(cur)>=200 and not SLOP.search(cur): continue
        print("\n=== "+d+" ===")
        print(build(d))
        break
