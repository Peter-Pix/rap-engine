#!/usr/bin/env python3
"""audit-rappers-v2.py — deep analysis of actual body content quality"""

import os, re, glob

content_dir = 'content/raperi'
files = sorted(glob.glob(f'{content_dir}/*.mdx'))

for filepath in files:
    slug = os.path.basename(filepath).replace('.mdx', '')
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    if text.startswith('\ufeff'):
        text = text[1:]

    # Parse frontmatter
    lines = text.split('\n')
    fm = {}
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
        elif in_fm:
            m = re.match(r'^(\w+):\s*(.+)$', line)
            if m:
                key = m.group(1)
                val = m.group(2).strip()
                fm[key] = val

    # Body content (everything after --- close)
    body = '\n'.join(lines[fm_end+1:]).strip() if fm_end > 0 else ''
    
    # Description from frontmatter
    desc = fm.get('description', '').replace('"', '').replace('>-\n  ', '').replace('>-\n', '').replace('\n', ' ')
    desc = re.sub(r'\s+', ' ', desc).strip()
    desc_len = len(desc)
    
    # Body content length (actual text, not including markdown)
    body_text = re.sub(r'#{1,3}\s+', '', body)  # remove headings
    body_text = re.sub(r'\*\*(.+?)\*\*', r'\1', body_text)  # remove bold
    body_text = re.sub(r'\n{2,}', '\n', body_text)
    body_text = body_text.strip()
    body_len = len(body_text)
    
    # Word count
    body_words = len(body_text.split())
    
    # Has any body content
    has_body = body_len > 50
    
    # Check which sections exist
    sections = []
    for m in re.finditer(r'^#{1,3}\s+(.+)$', body, re.MULTILINE):
        sections.append(m.group(1).strip())
    
    # Genre count
    genre_count = 0
    for line in lines[:fm_end+1] if fm_end > 0 else lines:
        if line.strip().startswith('genre:'):
            genre_count = line.count('-')
            break
    
    # Quality score (0-100)
    score = 0
    score += min(desc_len // 5, 15)  # up to 15 for description
    score += min(body_len // 200, 40)  # up to 40 for body length
    score += min(body_words // 50, 15)  # up to 15 for word count
    score += min(len(sections) * 5, 15)  # up to 15 for section variety
    score += min(genre_count * 3, 10)  # up to 10 for genre variety
    if 'publishedAt' in fm:
        score += 5

    # Category
    if body_len < 50 and desc_len < 30:
        category = "🔴 SKELETON"
    elif body_len < 50 and desc_len < 80:
        category = "🟠 MINIMAL"
    elif body_len < 200 or desc_len < 80:
        category = "🟡 SHORT"
    elif body_len < 800:
        category = "🟢 MEDIUM"
    elif body_len < 2000:
        category = "🔵 GOOD"
    else:
        category = "💎 EXCEPTIONAL"

    # Mark skeleton/no-body files
    is_big_name = slug in ['yzomandias', 'nik-tendo', 'viktor-sheen', 'rytmus', 'separ', 'ben-cristovao', 
                           'pil-c', 'calin', 'smack', 'ektor', 'majk-spirit', 'lvcas-dope', 'ego',
                           'maniak', 'dms', 'james-cole', 'michajlov', 'indus', 'refew']
    
    # Truncate desc for display
    desc_short = desc[:60] + '...' if len(desc) > 60 else desc
    body_short = body_text[:100].replace('\n', ' ') + '...' if len(body_text) > 100 else body_text.replace('\n', ' ')

    # Detailed findings
    issues = []
    if not desc:
        issues.append("NO DESCRIPTION")
    elif desc_len < 30:
        issues.append(f"TINY DESC ({desc_len} chars)")
    elif desc_len < 80:
        issues.append(f"SHORT DESC ({desc_len} chars)")
    
    if not body:
        issues.append("EMPTY BODY")
    elif body_len < 200:
        issues.append(f"TINY BODY ({body_len}c/{body_words}w)")
    elif body_len < 500:
        issues.append(f"SHORT BODY ({body_len}c/{body_words}w)")

    if 'publishedAt' not in fm:
        issues.append("MISSING DATES")
    
    if is_big_name:
        issues.append("★ BIG NAME ★")

    issues_str = ' | '.join(issues) if issues else 'OK'
    
    print(f"{category:20s} | {score:3d} | {slug:<30s} | D:{desc_len:<4d} B:{body_len:<5d} W:{body_words:<4d} S:{len(sections)} | {issues_str}")
    if category in ["🔴 SKELETON", "🟠 MINIMAL"] or is_big_name:
        if sections:
            print(f"{'':20s}   sections: {sections}")
        print()