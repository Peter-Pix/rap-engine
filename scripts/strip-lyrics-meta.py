#!/usr/bin/env python3
"""Krok 2.2.6 — odstraní lyrics metadata z track extraMeta.

Texty písní z Rap Monitoru (Peterova AI apka) = AI původ + autorská práva.
Odstranit: lyricsAttempts, lyricsLastStatus, sourceLyrics.
Texty samotné nejsou v entitách (jen v .data/phase3/rm-songs.json).

Použití: python3 scripts/strip-lyrics-meta.py [--write]
"""
import json,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT=os.path.join(ROOT,"content","entities")
WRITE="--write" in sys.argv
KEYS=('lyricsAttempts','lyricsLastStatus','sourceLyrics')
n=0
for d in sorted(os.listdir(ENT)):
    if not d.startswith('track_'): continue
    mp=f"{ENT}/{d}/meta.json"
    try: m=json.load(open(mp,encoding='utf-8'))
    except Exception: continue
    em=m.get('extraMeta') or {}
    found=[k for k in KEYS if k in em]
    if not found: continue
    for k in found: em.pop(k,None)
    if WRITE:
        m['extraMeta']=em
        json.dump(m,open(mp,'w',encoding='utf-8'),indent=2,ensure_ascii=False); open(mp,'a').write('\n')
    n+=1
print(f"{'ZAPSÁNO' if WRITE else 'DRY'}: lyrics metadata odstraněna={n}")
