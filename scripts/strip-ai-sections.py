#!/usr/bin/env python3
"""
Odstraní AI šablonové sekce ze karet umělců.

KLÍČOVÉ PRAVIDLO: rozhoduje PŘÍTOMNOST ZDROJŮ v sekci.
  - Sekce obsahuje odkaz ([text](http...)) → OVĚŘENÁ → nechat
  - Sekce bez jediného odkazu → AI SLOP → smazat (pokud nadpis je AI vzor)

Tak se zachová ověřená vrstva (Hasan "V kostce", "Kariéra: od Tábora..."
se zdroji) a smaže se AI vrstva (Hasan "## Kariéra" bez zdrojů).

Smazat i vždy-AI nadpisy (Superpower, Generační kontext, Kontroverze,
blokquote tagline) i se zdroji — ty jsou vždy sloh, ne fakt.

Použití: python3 scripts/strip-ai-sections.py [--write]
"""
import re, sys
from pathlib import Path

ENT = Path(__file__).resolve().parent.parent / "content" / "entities"
WRITE = "--write" in sys.argv

# Vždy AI (smaž i kdyby měly zdroj) — čistě slohové sekce
ALWAYS_AI = {
 "Kontroverze","Superpower","Generační kontext","Vliv","Vliv na scénu","Kritika",
 "Vliv na český rap","Vliv na českou scénu","Vliv na scéně","Vliv a kontext",
 "Největší superschopnost","Čím je jiný než ostatní","Čím je jiný než zbytek scény",
 "Proč ho část lidí nemůže vystát","Proč ho část lidí nemůže dostat",
 "Proč ho část lidí přehlíží","Proč ho část lidí podceňuje",
 "Proč ho část lidí dlouho nepochopila","Ten detail, který říká hodně",
 "Ten zvláštní epilog","Ten detail s přezdívkou","V čem je unikátní",
}

def is_ai_heading(h):
    h = h.strip()
    if h in ALWAYS_AI: return True
    if re.match(r"^Kariéra\s*:", h): return "soft"
    if h in {"Kariéra","Kritika","Význam na scéně","Význam na scéne","V kostce",
             "Shrnutí jednou větou","Jednou větou","Kariéra ve třech větách",
             "Role ve scéně","Místo na scéně","Milion+ éra","Nejdůležitější etapa",
             "Nejdůležitější etapy"}: return "soft"
    if re.match(r"^V čem (je|byl) .+ (unikátní|výjimečný|silný|jinej|jiný)$", h): return "soft"
    if re.match(r"^Koho (si pustit dál|poslouchat dál)", h): return "soft"
    if re.match(r"^Pokud (tě baví|se ti líbí) ", h): return "soft"
    if re.match(r"^Čím je .+ (jiný|jinej|výjimečný|odlišný)", h): return "soft"
    if re.match(r"^\d+\)\s+", h): return "soft"
    return False

def section_has_source(lines):
    """Má sekce aspoň jeden markdown odkaz?"""
    body = "\n".join(lines)
    return bool(re.search(r"\]\(https?://", body))

def find_spans(t):
    lines = t.split("\n")
    heads = []
    for i, ln in enumerate(lines):
        m = re.match(r"^(#{2,3})\s+(.+?)\s*$", ln)
        if m: heads.append((i, m.group(2).strip(), len(m.group(1))))
    if not heads: return []

    spans = []
    for idx, (i, title, lvl) in enumerate(heads):
        kind = is_ai_heading(title)
        if not kind: continue
        # konec sekce
        end = len(lines)
        for k in range(idx+1, len(heads)):
            ni, nt, nl = heads[k]
            if nl <= lvl:
                end = ni; break
        body = lines[i+1:end]
        # "soft" AI nadpis: smaž POUZE pokud sekce nemá žádný zdroj
        if kind == "soft" and section_has_source(body):
            continue
        start = i
        j = i-1
        while j>=0 and lines[j].strip()=="": j-=1
        if j>=0 and lines[j].strip().startswith(">"):
            while j>=0 and lines[j].strip().startswith(">"): j-=1
            while j>=0 and lines[j].strip()=="": j-=1
            start = j+1
        spans.append((start, end))
    spans.sort()
    merged = []
    for s,e in spans:
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s,e))
    return merged

def clean(t):
    spans = find_spans(t)
    if not spans: return t, False
    lines = t.split("\n")
    kill = set()
    for s,e in spans:
        for i in range(s,e): kill.add(i)
    kept = [ln for i,ln in enumerate(lines) if i not in kill]
    new = "\n".join(kept)
    new = re.sub(r"\n{3,}", "\n\n", new).strip()
    if not new.endswith("\n"): new += "\n"
    return new, True

changed = []
for d in sorted(ENT.iterdir()):
    if not d.name.startswith("artist_"): continue
    f = d/"entity.mdx"
    if not f.exists(): continue
    t = f.read_text()
    new, ok = clean(t)
    if ok and new != t:
        changed.append((d.name, len(t), len(new)))
        if WRITE: f.write_text(new)

print(f"{'ZAPSÁNO' if WRITE else 'DRY-RUN'}: {len(changed)} karet")
print(f"celkem −{sum(a-b for _,a,b in changed)} znaků")
print()
for name,a,b in changed[:40]:
    print(f"  {name[7:]:24} {a:6} → {b:6}  (−{a-b})")
