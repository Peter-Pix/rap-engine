#!/usr/bin/env python3
"""fix-yaml-deep.py — Deep YAML restructure for 12 broken files"""

import re, os, yaml

files = [
    'content/raperi/astral-one.mdx', 'content/raperi/astralkid22.mdx', 'content/raperi/badboy-berlin.mdx',
    'content/raperi/blako.mdx', 'content/raperi/bobby-blaze.mdx', 'content/raperi/dj-opia.mdx',
    'content/raperi/kamil-hoffmann.mdx', 'content/raperi/robin-zoot.mdx', 'content/raperi/tk27.mdx',
    'content/labely/rychli-kluci.mdx', 'content/labely/ty-nikdy.mdx', 'content/labely/znk.mdx',
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    lines = text.split('\n')
    in_fm = False
    fm_lines = []
    body_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped == '---':
            if not in_fm:
                in_fm = True
                continue
            else:
                in_fm = False
                continue
        if in_fm:
            fm_lines.append(line)
        else:
            body_lines.append(line)
    
    # Restructure: de-indent all non-structural indentation
    restructured = []
    for line in fm_lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            restructured.append(stripped)
            continue
        # If it's a list item under a valid YAML parent, keep indent
        # Otherwise de-indent top-level lines
        if line.startswith('  ') and not stripped.startswith('-'):
            # Check if previous non-empty line ends with : (valid YAML nesting)
            prev_line = restructured[-1].strip() if restructured else ''
            if prev_line.endswith(':') or prev_line.endswith('>') or prev_line.endswith('|'):
                # Valid structural indentation — keep
                restructured.append(line)
            else:
                # Top-level field that got indented — de-indent
                restructured.append(stripped)
        else:
            restructured.append(line)
    
    new_fm = '\n'.join(restructured)
    new_lines = ['---', new_fm, '---'] + body_lines
    new_text = '\n'.join(new_lines)
    
    # Validate with yaml
    try:
        parsed = yaml.safe_load(new_fm)
        if parsed is None:
            parsed = {}
        if not isinstance(parsed, dict):
            print(f"  ⚠️ {path} — parsed as {type(parsed).__name__}, not dict")
            # Try more aggressive fix
            aggressive = []
            for line in restructured:
                aggressive.append(line.lstrip())
            new_fm2 = '\n'.join(aggressive)
            try:
                parsed2 = yaml.safe_load(new_fm2)
                if isinstance(parsed2, dict):
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write('---\n' + new_fm2 + '\n---\n' + '\n'.join(body_lines))
                    print(f"✅ {path} — fixed (aggressive de-indent)")
                else:
                    print(f"  ❌ {path} — still broken")
            except yaml.YAMLError as e:
                print(f"  ❌ {path} — YAML error: {e}")
        else:
            with open(path, 'w', encoding='utf-8') as f:
                f.write('---\n' + new_fm + '\n---\n' + '\n'.join(body_lines))
            print(f"✅ {path} — fixed YAML ({len(restructured)} fields)")
    except yaml.YAMLError as e:
        print(f"  ❌ {path} — YAML error after fix: {e}")
        # Aggressive fallback
        aggressive = []
        for line in restructured:
            aggressive.append(line.lstrip())
        new_fm2 = '\n'.join(aggressive)
        try:
            parsed2 = yaml.safe_load(new_fm2)
            if isinstance(parsed2, dict):
                with open(path, 'w', encoding='utf-8') as f:
                    f.write('---\n' + new_fm2 + '\n---\n' + '\n'.join(body_lines))
                print(f"✅ {path} — fixed (aggressive de-indent)")
            else:
                print(f"  ❌ {path} — still broken after aggressive")
        except yaml.YAMLError as e2:
            print(f"  ❌ {path} — YAML error after aggressive: {e2}")

print("\n🎯 Done!")