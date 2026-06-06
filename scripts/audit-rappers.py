#!/usr/bin/env python3
"""audit-rappers.py — systematically analyze all 227 rapper profiles"""

import os, re, glob

content_dir = 'content/raperi'
files = sorted(glob.glob(f'{content_dir}/*.mdx'))

print(f"Total rapper files: {len(files)}\n")

problems = {
    'missing_description': [],
    'missing_publishedAt': [],
    'generic_bio': [],        # placeholder bio (has description but generic)
    'tiny_bio': [],           # description under 100 chars
    'no_bio_section': [],     # no ## Bio section in MDX body
    'very_short_bio': [],     # Bio section under 3 paragraphs
    'has_longform_marker': [],# has hasLongform: true
}

generic_signals = [
    'je rapová hvězda',
    'je známý český rapper',
    'je český rapper',
    'je rapper a',
    'je český zpěvák',
    'je talentovaný',
    'je hudebník',
    'je populární',
    'je český',
    'je slovenský',
    'je polský',
    'nejsou o něm dostupné',
    'není o něm dostupných',
    'není o něm mnoho informací',
    'informace nejsou k dispozici',
    'blíže nespecifikováno',
    'není známo',
    'není známé',
    'není veřejně známo',
    'chybí informace',
]

for filepath in files:
    filename = os.path.basename(filepath)
    slug = filename.replace('.mdx', '')
    
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Check for BOM
    if text.startswith('\ufeff'):
        text = text[1:]
    
    lines = text.split('\n')
    
    # Parse frontmatter
    fm = {}
    in_fm = False
    fm_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped == '---':
            if not in_fm:
                in_fm = True
            else:
                break
        elif in_fm:
            fm_lines.append(line)
    
    for line in fm_lines:
        m = re.match(r'^(\w+):\s*(.+)$', line)
        if m:
            key = m.group(1)
            val = m.group(2).strip()
            fm[key] = val
    
    # Check description
    desc = fm.get('description', '')
    desc_len = len(desc.replace('"', ''))
    
    if desc_len < 30:
        problems['tiny_bio'].append(slug)
    
    # Check for generic description signals
    is_generic = False
    desc_lower = desc.lower()
    for signal in generic_signals:
        if signal in desc_lower:
            is_generic = True
            break
    
    if is_generic:
        problems['generic_bio'].append(slug)
    
    # Check missing publishedAt
    if 'publishedAt' not in fm:
        problems['missing_publishedAt'].append(slug)
    
    # Check missing description
    if 'description' not in fm:
        problems['missing_description'].append(slug)
    
    # Check for ## Bio section in body
    body_start = text.find('\n---\n') + 5 if '\n---\n' in text else len(text)
    body = text[body_start:]
    
    if '## Bio' not in body and 'hasLongform' not in fm:
        problems['no_bio_section'].append(slug)
    
    # Check if has hasLongform
    if 'hasLongform' in fm and fm['hasLongform'].strip() in ('true', '"true"'):
        problems['has_longform_marker'].append(slug)

# Print results
print("=" * 70)
print("RAPPER PROFILE ANALYSIS")
print("=" * 70)

print(f"\n📋 Missing description (no frontmatter description): {len(problems['missing_description'])} files")
for s in sorted(problems['missing_description']):
    print(f"   • {s}")
    if s in problems['no_bio_section']:
        problems['no_bio_section'].remove(s)

print(f"\n📋 Missing publishedAt: {len(problems['missing_publishedAt'])} files")
for s in sorted(problems['missing_publishedAt']):
    print(f"   • {s}")

print(f"\n📋 Tiny description (<30 chars): {len(problems['tiny_bio'])} files")
for s in sorted(problems['tiny_bio']):
    print(f"   • {s}")

print(f"\n📋 Generic description (placeholder vibes): {len(problems['generic_bio'])} files")
for s in sorted(problems['generic_bio']):
    print(f"   • {s}")

print(f"\n📋 No ## Bio section in body: {len(problems['no_bio_section'])} files")
for s in sorted(problems['no_bio_section']):
    print(f"   • {s}")

print(f"\n📋 Has hasLongform=true: {len(problems['has_longform_marker'])} files")
for s in sorted(problems['has_longform_marker']):
    print(f"   • {s}")

# Now let's do a deeper analysis: which files have quality content
print("\n" + "=" * 70)
print("TOP PROFILES — nejkvalitnější podle délky a struktury")
print("=" * 70)

# Score each profile
scores = []
for filepath in files:
    slug = os.path.basename(filepath).replace('.mdx', '')
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    if text.startswith('\ufeff'):
        text = text[1:]
    
    lines = text.split('\n')
    
    # Parse frontmatter
    fm = {}
    in_fm = False
    for line in lines:
        stripped = line.strip()
        if stripped == '---':
            if not in_fm:
                in_fm = True
            else:
                break
        elif in_fm:
            m = re.match(r'^(\w+):\s*(.+)$', line)
            if m:
                key = m.group(1)
                val = m.group(2).strip()
                fm[key] = val
    
    score = 0
    
    # Description length
    desc = fm.get('description', '')
    desc_clean = desc.replace('"', '')
    score += min(len(desc_clean), 500)
    
    # Has Bio section
    body_match = re.search(r'---\n(.*)', text, re.DOTALL)
    body = body_match.group(1) if body_match else ''
    has_bio = '## Bio' in body
    bio_len = 0
    if has_bio:
        bio_match = re.search(r'## Bio\n(.+?)(?=\n## |$)', body, re.DOTALL)
        if bio_match:
            bio_len = len(bio_match.group(1).strip())
            score += min(bio_len, 2000)
    
    # Genres
    has_genre = 'genre:' in text
    if has_genre:
        score += 50
    
    # Label
    if 'label:' in text and '"' in text:
        score += 30
    
    # Has relatedRappers/relatedAlbums
    if 'relatedRappers:' in fm or 'relatedAlbums:' in fm:
        score += 50
    
    # PublishedAt penalty
    if 'publishedAt' not in fm:
        score -= 100
    
    # Description penalty
    if 'description' not in fm:
        score -= 200
    
    scores.append((slug, score, len(desc_clean), bio_len))

# Sort by score descending
scores.sort(key=lambda x: -x[1])

print(f"{'Rapper':<35} {'Score':<8} {'Desc':<6} {'Bio':<8} {'Status':<10}")
print("-" * 70)
for slug, score, desc_len, bio_len in scores[:20]:
    status = "✅" if score > 300 else ("⚠️" if score > 100 else "❌")
    print(f"{slug:<35} {score:<8} {desc_len:<6} {bio_len:<8} {status}")

# Depth analysis — how many have detailed long bios
print(f"\n📊 Profily s Bio delší než 500 znaků: {sum(1 for _, _, _, b in scores if b > 500)}")
print(f"📊 Profily s Bio delší než 2000 znaků: {sum(1 for _, _, _, b in scores if b > 2000)}")
print(f"📊 Profily zcela bez Bio sekce: {len(problems['no_bio_section'])}")
print(f"📊 Profily s generickým description: {len(problems['generic_bio'])}")

# Mid-tier to review
print("\n" + "=" * 70)
print("STREDNÍ KVALITA — vyžadují dopracování")
print("=" * 70)
mid = [s for s in scores if 100 < s[1] < 400]
for slug, score, d, b in mid[:25]:
    print(f"  {slug:<35} score={score:<5} desc={d}<5 bio={b}")

# Lowest quality
print(f"\n{'='*70}")
print(f"NEJHORŠÍ PROFILY (score < 100)")
print(f"{'='*70}")
low = [s for s in scores if s[1] < 100]
for slug, score, d, b in low[:30]:
    print(f"  {slug:<35} score={score:<5} desc={d}<5 bio={b}")