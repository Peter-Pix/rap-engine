#!/usr/bin/env python3
"""Stáhne obaly alb z Deezer CDN lokálně → public/images/albums/<slug>.webp.

602 alb má v meta.image Deezer CDN URL (hotlink). Ten funguje, ale je to
závislost na cizím CDN — rate-limity, změny URL struktury. Stáhneme je
lokálně pro plnou nezávislost (stejně jako artist fotky).

Po stažení aktualizuje meta.json → image = /images/albums/<slug>.webp.

Použití:
  python3 scripts/download-album-covers.py          # DRY run
  DRY=0 python3 scripts/download-album-covers.py     # reálně stáhne
"""
import json, os, io, time, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENT = os.path.join(ROOT, 'content', 'entities')
OUT_DIR = os.path.join(ROOT, 'public', 'images', 'albums')
DRY = os.environ.get('DRY', '1') != '0'
SIZE = 1000

os.makedirs(OUT_DIR, exist_ok=True)

entities = json.load(open(os.path.join(ROOT, '.content-cache', 'entities.json')))
albums = [e for e in entities.values() if e.get('type') == 'album']

todo = []
for a in albums:
    img = a.get('image') or ''
    if img.startswith('http') and 'dzcdn.net' in img:
        todo.append(a)

print(f'Alb s Deezer CDN obrázkem: {len(todo)}')

ok = fail = skip = 0
for a in todo:
    slug = a['slug']
    out = os.path.join(OUT_DIR, f'{slug}.webp')
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        skip += 1
        continue
    url = a['image']
    if DRY:
        print(f'  [DRY] {slug:40} {a["title"][:35]}')
        ok += 1
        continue
    try:
        req = urllib.request.Request(url, headers={'User-Agent': '4rap.cz/1.0'})
        raw = urllib.request.urlopen(req, timeout=30).read()
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        w, h = im.size
        s = min(w, h)
        im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        im.save(out, 'WEBP', quality=82, method=6)
        if os.path.getsize(out) < 1000:
            os.remove(out); fail += 1; print(f'  FAIL (malý): {slug}'); continue
        # update meta.json
        mp = os.path.join(ENT, a['id'], 'meta.json')
        if os.path.exists(mp):
            m = json.load(open(mp))
            m['image'] = f'/images/albums/{slug}.webp'
            json.dump(m, open(mp, 'w'), ensure_ascii=False, indent=2)
            open(mp, 'a').write('\n')
        ok += 1
        if ok % 50 == 0:
            print(f'  ... {ok} staženo')
    except Exception as e:
        fail += 1
        print(f'  FAIL {slug}: {e}')
        if os.path.exists(out): os.remove(out)
    time.sleep(0.25)

print(f'\nOK {ok} · SKIP {skip} · FAIL {fail} · DRY={DRY}')
