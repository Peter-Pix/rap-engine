#!/usr/bin/env python3
"""Krok 2.1 v2 — bohatší MDX tracků (400+ znaků) z faktů.

Sekce:
- O skladbě (interpret, album, rok)
- Fakta (délka, hosté, žánr, label, ISRC, číslo tracku)
- Kontext (album → interpret, diskografie)
- Poslechnout (odkazy)

NIKDY negeneruje AI text. Cíl: ≥ 400 znaků (noindex gate).

Použití: python3 scripts/rebuild-track-mdx-v2.py [--write] [--min-content=N]
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
MIN=400
for a in sys.argv:
    if a.startswith("--min-content="): MIN=int(a.split("=")[1])

def load(a,f="meta.json"):
    try: return json.load(open(f"{ENT}/{a}/{f}",encoding='utf-8'))
    except Exception: return None
def title_of(a):
    m=load(a); return (m or {}).get('title',a.split('_',1)[-1])
def slug_of(a):
    m=load(a); return (m or {}).get('slug','')

def fmt(sec):
    if not sec: return None
    m,s=divmod(int(sec),60); return f"{m}:{s:02d}"

def build(aid):
    m=load(aid); r=load(aid,"relations.json") or {}
    if not m: return ""
    em=m.get('extraMeta') or {}
    pa=r.get('primaryArtist') or []; al=r.get('belongsToAlbum') or []
    fe=r.get('featuring') or []; gs=r.get('genres') or []
    ls=r.get('labels') or []; pr=r.get('producers') or []
    st=r.get('styles') or []
    t=m.get('title','').strip()
    if not pa: return ""
    aid0=pa[0]; an=title_of(aid0)
    alb=load(al[0]) if al else None
    L=[]
    # O skladbě
    head=f"„{t}“ je skladba od [{an}](/raperi/{slug_of(aid0)})"
    if len(pa)>1:
        others=", ".join(f"[{title_of(x)}](/raperi/{slug_of(x)})" for x in pa[1:3])
        head+=f" ve spolupráci s {others}"
    if alb: head+=f", vyšla na albu [{alb.get('title')}](/alba/{alb.get('slug','')})"+(f" ({alb.get('year')})" if alb.get('year') else "")
    head+="."
    L+=["## O skladbě","",head,""]
    # Fakta
    facts=[]
    if alb: facts.append(f"**Album:** [{alb.get('title')}](/alba/{alb.get('slug','')})"+(f" ({alb.get('year')})" if alb.get('year') else ""))
    d=fmt(em.get('duration'))
    if d: facts.append(f"**Délka:** {d}")
    if em.get('trackNumber'): facts.append(f"**Číslo v tracklistu:** {em['trackNumber']}")
    if fe:
        fn=", ".join(f"[{title_of(x)}](/raperi/{slug_of(x)})" for x in fe)
        facts.append(f"**Hosté:** {fn}")
    if pr:
        pn=", ".join(f"[{title_of(x)}](/raperi/{slug_of(x)})" for x in pr[:3])
        facts.append(f"**Produkce:** {pn}")
    if gs:
        gn=", ".join(title_of(x) for x in gs[:3]); facts.append(f"**Žánr:** {gn}")
    if st:
        sn=", ".join(title_of(x) for x in st[:3]); facts.append(f"**Styl:** {sn}")
    if ls:
        ln=", ".join(title_of(x) for x in ls[:2]); facts.append(f"**Label:** {ln}")
    if em.get('isrc'): facts.append(f"**ISRC:** {em['isrc']}")
    if em.get('explicit') is True: facts.append("**Explicitní obsah:** ano")
    if facts: L+=["## Fakta",""]+[f"- {x}" for x in facts]+[""]
    # Kontext
    ctx=[]
    if alb:
        ctx.append(f"Skladba je součástí alba „{alb.get('title')}“"+(f" z roku {alb.get('year')}" if alb.get('year') else "")+f" od {an}.")
    if fe:
        ctx.append(f"Na nahrávce se podílí {', '.join(title_of(x) for x in fe)}.")
    if pr:
        ctx.append(f"O produkci se postaral {', '.join(title_of(x) for x in pr[:3])}.")
    if ctx: L+=["## Kontext",""," ".join(ctx),""]
    # Poslechnout
    srcs=[s for s in (em.get('sources') or []) if isinstance(s,str) and s.startswith('http')]
    if srcs:
        names={'deezer':'Deezer','youtube':'YouTube','spotify':'Spotify','musicbrainz':'MusicBrainz','rap-monitor':'Rap Monitor'}
        L+=["## Poslechnout a zdroje",""]
        for s in srcs[:4]:
            dom=next((v for k,v in names.items() if k in s),'Odkaz')
            L.append(f"- [{dom}]({s})")
        L.append("")
    return "\n".join(L).strip()+"\n"

# ─── rozšířená verze: přidá AI-označené sekce pro pás A/B ───
def build_full(aid, allow_ai=False):
    base = build(aid)
    if not allow_ai: return base
    m=load(aid); em=(m or {}).get('extraMeta') or {}
    th=em.get('themes') or []; mo=em.get('moods') or []
    if not th and not mo: return base
    extra=["## Témata a nálada","","> AI odhad (Rap Monitor) — není ověřený fakt.",""]
    if th: extra.append(f"- **Témata:** {', '.join(th)}")
    if mo: extra.append(f"- **Nálada:** {', '.join(mo)}")
    extra.append("")
    # vložit před Poslechnout
    if "## Poslechnout" in base:
        return base.replace("## Poslechnout", "\n".join(extra)+"\n## Poslechnout")
    return base+"\n"+"\n".join(extra)

rebuilt=0; still_short=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    p=f"{ENT}/{d}/entity.mdx"
    cur=open(p,encoding='utf-8').read() if os.path.isfile(p) else ""
    if len(cur)>=MIN: continue
    em=load(d).get('extraMeta') or {}
    use_ai = em.get('phase3Pas') in ('A','B')
    new=build_full(d, allow_ai=use_ai)
    if len(new)<MIN:
        still_short+=1
        if WRITE and new:
            open(p,'w',encoding='utf-8').write(new)
        continue
    if WRITE: open(p,'w',encoding='utf-8').write(new)
    rebuilt+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: obohaceno na {MIN}+={rebuilt} stále krátkých={still_short}")
if not WRITE:
    for d in sorted(os.listdir(ENT)):
        if not d.startswith('track_'): continue
        p=f"{ENT}/{d}/entity.mdx"
        if not os.path.isfile(p) or len(open(p,encoding='utf-8').read())>=MIN: continue
        print("\n=== "+d+" ===")
        print(build(d))
        break

