#!/usr/bin/env python3
"""Check for track/video title mismatches."""
import json, glob, os, re

def norm(s):
    s = s.lower().strip()
    # Remove Czech diacritics
    repl = {'á':'a','é':'e','í':'i','ó':'o','ú':'u','ů':'u','š':'s','č':'c','ř':'r','ž':'z','ý':'y','ď':'d','ť':'t','ň':'n'}
    for k,v in repl.items():
        s = s.replace(k, v)
    # Remove punctuation and special chars
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

tracks_dir = 'content/entities'
mismatches = []

for meta_path in sorted(glob.glob(f'{tracks_dir}/track_*/meta.json')):
    with open(meta_path) as f:
        meta = json.load(f)
    
    yt = meta.get('youtube')
    if not yt:
        continue
    
    track_title = meta['title']
    video_title = yt.get('title', '')
    track_id = meta['id']
    
    track_norm = norm(track_title)
    video_norm = norm(video_title)
    
    if not track_norm or not video_norm:
        continue
    
    # Strip feat. parts for comparison
    track_short = re.split(r'\s+(feat|ft|prod|official|audio|video|remix|lyric|text)', track_norm)[0]
    video_short = re.split(r'\s+(feat|ft|prod|official|audio|video|remix|lyric|text)', video_norm)[0]
    
    if track_short not in video_short and video_short not in track_short:
        mismatches.append({
            'id': track_id,
            'track_title': track_title,
            'video_title': video_title,
            'video_id': yt['id'],
            'channel': yt.get('channel', ''),
            'meta_path': meta_path
        })

print(f'Total mismatches: {len(mismatches)}')
print()
for m in mismatches:
    print(f"{m['id']}")
    print(f"  Track:   {m['track_title']}")
    print(f"  Video:   {m['video_title']}")
    print(f"  Channel: {m['channel']}")
    print(f"  VideoID: {m['video_id']}")
    print()