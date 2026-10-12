#!/usr/bin/env python3
"""Doplní metadata tracků z Deezeru PŘES ID (bezpečné — žádné hledání podle jména).

Vstup:  track meta.json s Deezer URL v extraMeta.sources (4 042 tracků)
Volá:   api.deezer.com/track/{id}
Zapis:  extraMeta.preview, extraMeta.releaseDate, extraMeta.bpm, extraMeta.trackPosition
Cache:  .data/deezer-track-cache.json (aby se nevolalo 2×)

Použití:
  python3 scripts/enrich-tracks-deezer.py          # DRY run
  DRY=0 python3 scripts/enrich-tracks-deezer.py     # reálně stáhne a zapíše
"""
import json, os, re, glob, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, 'content', 'entities')
CACHE = os.path.join(ROOT, '.data', 'deezer-track-cache.json')
DRY = os.environ.get('DRY', '1') != '0'

cache = {}
if os.path.exists(CACHE):
    cache = json.load(open(CACHE))

# 1) nasbírej track → id
targets = []
for d in sorted(glob.glob(os.path.join(ENT, 'track_*', 'meta.json'))):
    m = json.load(open(d))
    em = m.get('extraMeta') or {}
    srcs = em.get('sources') or []
    deez = [s for s in srcs if 'deezer.com/track' in str(s)]
    if not deez:
        continue
    mt = re.search(r'track/(\d+)', str(deez[0]))
    if not mt:
        continue
    targets.append((d, m, mt.group(1)))

print(f'Tracků s Deezer ID: {len(targets)}  |  v cache: {len(cache)}')

def api(tid):
    url = f'https://api.deezer.com/track/{tid}'
    r = urllib.request.urlopen(
        urllib.request.Request(url, headers={'User-Agent': '4rap.cz/1.0'}),
        timeout=15)
    return json.load(r)

touched = 0
for i, (path, m, tid) in enumerate(targets):
    em = m.get('extraMeta') or {}
    # už máme preview? přeskoč
    if em.get('preview'):
        continue
    if tid not in cache:
        if DRY:
            continue
        try:
            cache[tid] = api(tid)
        except Exception as e:
            cache[tid] = {'error': str(e)}
        time.sleep(0.15)
    d = cache.get(tid) or {}
    if d.get('error') or not d.get('title'):
        continue
    em['preview'] = d.get('preview') or em.get('preview')
    if d.get('release_date'):
        em['releaseDate'] = d['release_date']
    if d.get('bpm'):
        em['bpm'] = d['bpm']
    if d.get('track_position'):
        em['trackPosition'] = d['track_position']
    m['extraMeta'] = em
    if not DRY:
        json.dump(m, open(path, 'w'), ensure_ascii=False, indent=2)
        open(path, 'a').write('\n')
    touched += 1
    if i % 200 == 0:
        print(f'  {i}/{len(targets)} … (zapsáno {touched})', flush=True)

os.makedirs(os.path.dirname(CACHE), exist_ok=True)
json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
print(f'\nHotovo: zapsáno {touched} · cache {len(cache)} · DRY={DRY}')
