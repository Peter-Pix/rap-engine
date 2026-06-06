#!/usr/bin/env python3
"""phase1-schema-cleanup.py — Add new schema fields + strip useless fields"""

import re, os, glob

BASE = 'content'

# ─── FIELDS TO ADD TO SCHEMA (will be kept in files) ───
# These are useful — we add them to contentlayer.config.ts later
KEEP_FIELDS = {
    'raperi': {
        'deezerId', 'socials', 'aliases', 'origin', 'labels', 'subgenres',
        'status', 'associatedActs', 'createdAt', 'seo', 'birthPlace', 'hometown'
    },
    'alba': {
        'deezerAlbumId', 'upc', 'origin', 'releaseType', 'features', 'featuresNames',
        'producers', 'producersNames', 'duration', 'explicit', 'releaseDate',
        'nbTracks', 'subgenres'
    },
    'skladby': {
        'deezerTrackId', 'releaseType', 'explicit', 'releaseDate'
    },
    'labely': {
        'website', 'city', 'country', 'founder', 'genre'
    },
    'zanry': {
        'aliases', 'relatedGenres', 'caseSensitive', 'color'
    },
    'clanky': {
        'readingTime'
    }
}

# ─── FIELDS TO STRIP (useless, redundant, or internal) ───
STRIP_FIELDS = {
    'kind', 'id', 'meta', 'hasLongform', 'summary', 'yearsActive',
    'producerCollabs', 'spotifyId', 'collaborators', 'genres',
    'residence', 'keyTracks', 'albums', 'featuredOn', 'beefsDisses',
    'activeYears', 'noindex', 'appleMusicId', 'significance',
    'quotes', 'faq', 'timeline', 'discogsId', 'instruments',
    'keyReleases', 'producerCredits', 'originCity', 'tags', 'artists',
    'birthDate', 'city', 'country'
}

total_stripped = 0
total_files_modified = 0

for entity_type in os.listdir(BASE):
    dir_path = os.path.join(BASE, entity_type)
    if not os.path.isdir(dir_path):
        continue
    
    keep = KEEP_FIELDS.get(entity_type, set())
    
    for filepath in sorted(glob.glob(f'{dir_path}/*.mdx')):
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
        
        lines = text.split('\n')
        in_fm = False
        fm_end = -1
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped == '---':
                if not in_fm:
                    in_fm = True
                else:
                    fm_end = i
                    break
        
        if fm_end < 0:
            continue
        
        # Check which fields to strip
        new_lines = []
        modified = False
        for i, line in enumerate(lines):
            if i == 0 or i > fm_end:
                new_lines.append(line)
                continue
            
            m = re.match(r'^(\w+):', line)
            if m:
                key = m.group(1)
                if key in STRIP_FIELDS:
                    modified = True
                    total_stripped += 1
                    continue  # skip this line
            
            new_lines.append(line)
        
        if modified:
            total_files_modified += 1
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))

print(f"✅ Stripped {total_stripped} useless fields from {total_files_modified} files")
print(f"✅ Kept all useful fields (deezerId, socials, aliases, origin, etc.)")
