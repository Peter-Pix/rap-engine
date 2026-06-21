#!/usr/bin/env python3
"""
Systematický scan AI-halucinací v profile.careerSummary, profile.shortIntro,
profile.whatMakesUnique, profile.oneLiner, profile.superpower, profile.influence,
profile.controversy, profile.generationContext přes VŠECHNY 319 artistů.

Pattern detection:
- Marketing floskule ("nejúspěšnější", "legendární", "fenomén", "ikona", "korunovaný", "první")
- Generické věty bez konkrétních faktů ("X není jen Y, je to Z")
- Zvýšená hustota superlativů (>X superlativů na 100 slov)
- Cross-references na neexistující entity (zmiňovaná jména, která nejsou v DB)
"""

import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path("/Users/petrpiskacek/.openclaw/workspace/rap-knowledge-graph")
ENTITIES_DIR = REPO / "content" / "entities"

# Fieldy které scanuju
PROFILE_FIELDS = [
    "shortIntro",
    "whatMakesUnique",
    "careerSummary",
    "superpower",
    "oneLiner",
    "influence",
    "controversy",
    "generationContext",
]

# AI floskule patterny (regular expressions)
PATTERNS = {
    "superlativy": [
        r"\bnejúspěšnější\b",
        r"\bnejlepší\b",
        r"\bnejvětší\b",
        r"\bnejvíce\b",
        r"\bprvní\b(?!\s+[a-z])",  # "první" ale ne "první X"
        r"\bjeden z mála\b",
        r"\bjeden z největších\b",
        r"\bjeden z nejlepších\b",
        r"\bkorunovaný\b",
        r"\bnekorunovaný\b",
        r"\blegendární\b",
        r"\blegendy\b",
        r"\bfenomén\b",
        r"\bikona\b",
        r"\binstituce\b",
    ],
    "marketing_klišé": [
        r"\bnení jen .{1,40}, je to\b",  # "není jen X, je to Y"
        r"\bzměnil pravidla hry\b",
        r"\bkomerční fenomén\b",
        r"\bvlastní pravidla\b",
        r"\bvyprodává největší\b",
        r"\bmindset\b",
        r"\bvibe\b",
        r"\bsolitér\b",
        r"\bgenerace\b(?!\s+rapperů)",
        r"\bunikátní\b",
        r"\bnekompromisní\b",
        r"\bskalpel\b",
        r"\baretuš\b",
        r"\bboss\b",
    ],
    "weak_superlativy": [
        r"\bextrémně\b",
        r"\blesku\b",
        r"\bohromující\b",
        r"\bpřevratn[ýé]\b",
        r"\brev[olu]cion[áa]rn[íý]\b",
        r"\bgeni[áa]ln[íý]\b",
        r"\bmimo[áa]dn[íý]\b",
        r"\bvýjime[čc]n[ýé]\b",
    ],
    "marketingovy_jazyk": [
        r"\bpresti[zž]\b",
        r"\bspolupráce s\b",
        r"\bkomer[čc]n[íý]\b",
        r"\bfanou[šs]ci\b",
        r"\bstream[ay]\b",
        r"\bplaylist\b",
    ],
}

# Znaménko cross-reference: hledá velká slova (jména) v textu a ověřuje, jestli existují v DB
def find_capitalized_names(text: str) -> list[str]:
    """Najde slova s velkým počátečním písmenem (ne na začátku věty)."""
    # Use regex: capitalized words not at sentence start
    sentences = re.split(r'[.!?]\s+', text)
    names = set()
    for sentence in sentences:
        words = sentence.split()
        for i, word in enumerate(words):
            # Skip first word (sentence start)
            if i == 0:
                continue
            # Clean word
            clean = re.sub(r'[^A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽa-záčďéěíňóřšťúůýž]', '', word)
            if clean and clean[0].isupper() and len(clean) > 2:
                # Skip common Czech words that start sentences after period
                if clean.lower() not in {"že", "když", "kde", "kdo", "jak", "co", "ten", "tento", "tato"}:
                    names.add(clean)
    return list(names)


def scan_artist(slug: str, profile: dict, all_titles: set[str]) -> dict:
    """Scan jeden artist profil."""
    findings = {
        "slug": slug,
        "field_findings": defaultdict(list),
        "total_superlatives": 0,
        "total_klise": 0,
        "total_weak": 0,
        "total_marketing": 0,
        "total_words": 0,
        "mentioned_names": [],
        "unknown_names": [],
        "hustota_superlativu": 0.0,
        "suspicion_score": 0,
    }

    all_text = ""
    for field in PROFILE_FIELDS:
        text = profile.get(field, "")
        if not text or not isinstance(text, str):
            continue
        all_text += " " + text

        for pattern_name, patterns in PATTERNS.items():
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    findings["field_findings"][f"{field}__{pattern_name}"].extend(matches)
                    if pattern_name == "superlativy":
                        findings["total_superlatives"] += len(matches)
                    elif pattern_name == "marketing_klišé":
                        findings["total_klise"] += len(matches)
                    elif pattern_name == "weak_superlativy":
                        findings["total_weak"] += len(matches)
                    elif pattern_name == "marketingovy_jazyk":
                        findings["total_marketing"] += len(matches)

    # Word count
    findings["total_words"] = len(all_text.split())

    # Superlative density (per 100 words)
    if findings["total_words"] > 0:
        findings["hustota_superlativu"] = (findings["total_superlatives"] / findings["total_words"]) * 100

    # Find mentioned capitalized names (potential cross-refs)
    mentioned = find_capitalized_names(all_text)
    findings["mentioned_names"] = mentioned
    findings["unknown_names"] = [
        n for n in mentioned
        if n not in all_titles and len(n) > 2
        and not n.lower() in {"rapper", "rapperů", "rappera", "rapperem", "rapperovi", "alba", "albu", "albem",
                              "česku", "česka", "čechách", "slovensku", "slovenska", "scény", "scéně", "scénu",
                              "hudby", "hudbě", "hudbu", "režii", "režie", "režií",
                              "rapperem", "rappery", "rapperů", "rapper", "rappery"}
    ]

    # Suspicion score (heuristic)
    score = 0
    if findings["total_superlatives"] >= 5: score += 3
    elif findings["total_superlatives"] >= 3: score += 2
    elif findings["total_superlatives"] >= 1: score += 1

    if findings["total_klise"] >= 3: score += 3
    elif findings["total_klise"] >= 2: score += 2
    elif findings["total_klise"] >= 1: score += 1

    if findings["hustota_superlativu"] >= 5: score += 3
    elif findings["hustota_superlativu"] >= 3: score += 2
    elif findings["hustota_superlativu"] >= 1: score += 1

    if len(findings["unknown_names"]) >= 2: score += 2
    elif len(findings["unknown_names"]) >= 1: score += 1

    findings["suspicion_score"] = score

    return findings


def main():
    print("🔍 Systematický scan AI-halucinací v profilech\n")

    # Build set of all titles for cross-reference
    all_titles = set()
    for d in os.listdir(ENTITIES_DIR):
        meta_path = ENTITIES_DIR / d / "meta.json"
        if not meta_path.exists():
            continue
        try:
            meta = json.loads(meta_path.read_text())
            if meta.get("title"):
                all_titles.add(meta["title"])
            if meta.get("realName"):
                all_titles.add(meta["realName"])
        except:
            pass

    print(f"📚 Načteno {len(all_titles)} titles z DB pro cross-reference\n")

    # Scan all artists
    all_findings = []
    artist_dirs = [d for d in os.listdir(ENTITIES_DIR) if d.startswith("artist_")]
    print(f"👤 Scanning {len(artist_dirs)} artistů...\n")

    for artist_dir in artist_dirs:
        profile_path = ENTITIES_DIR / artist_dir / "profile.json"
        if not profile_path.exists():
            continue
        try:
            profile = json.loads(profile_path.read_text())
        except:
            continue

        slug = artist_dir.replace("artist_", "")
        findings = scan_artist(slug, profile, all_titles)
        all_findings.append(findings)

    # Sort by suspicion score
    all_findings.sort(key=lambda f: f["suspicion_score"], reverse=True)

    # Aggregate stats
    total_superlatives = sum(f["total_superlatives"] for f in all_findings)
    total_klise = sum(f["total_klise"] for f in all_findings)
    total_weak = sum(f["total_weak"] for f in all_findings)
    total_marketing = sum(f["total_marketing"] for f in all_findings)

    print(f"📊 Aggregate stats:")
    print(f"   Superlativy (nejúspěšnější, legendární, ...): {total_superlatives}")
    print(f"   Marketing klíšé: {total_klise}")
    print(f"   Weak superlativy (extrémně, geniální, ...): {total_weak}")
    print(f"   Marketing jazyk (prestiž, playlist, ...): {total_marketing}")
    print()

    # Top 30 suspicion
    print(f"🚨 Top 30 podezřelých (suspicion score):")
    for f in all_findings[:30]:
        title = ""
        meta_path = ENTITIES_DIR / f"artist_{f['slug']}" / "meta.json"
        if meta_path.exists():
            title = json.loads(meta_path.read_text()).get("title", f['slug'])
        print(f"   {f['suspicion_score']:2d}  {title:30s} (superlativy={f['total_superlatives']}, "
              f"klise={f['total_klise']}, weak={f['total_weak']}, marketing={f['total_marketing']}, "
              f"unknown_names={len(f['unknown_names'])})")

    # Pattern frequency
    print()
    print(f"🔤 Frekvence jednotlivých floskulí:")
    pattern_counter = Counter()
    for f in all_findings:
        for field_pattern, matches in f["field_findings"].items():
            field, pattern = field_pattern.split("__")
            pattern_counter[pattern] += len(matches)

    for pattern, count in pattern_counter.most_common(30):
        # Find example
        example = ""
        for f in all_findings:
            for field_pattern, matches in f["field_findings"].items():
                p = field_pattern.split("__")[1]
                if p == pattern and matches:
                    field = field_pattern.split("__")[0]
                    text = json.loads((ENTITIES_DIR / f"artist_{f['slug']}" / "profile.json").read_text()).get(field, "")
                    # Find first match with context
                    for match in matches:
                        idx = text.lower().find(match.lower())
                        if idx >= 0:
                            start = max(0, idx - 30)
                            end = min(len(text), idx + len(match) + 30)
                            example = text[start:end].strip()
                            break
                    if example:
                        break
            if example:
                break
        print(f"   {count:3d}× {pattern:30s} | {example[:60]}")

    # Save to JSON for later use
    output_path = REPO / "factcheck" / "04_layers" / "ai-hallucinations-scan.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Convert defaultdict to dict for JSON
    serializable = []
    for f in all_findings:
        f_copy = dict(f)
        f_copy["field_findings"] = {k: list(v) for k, v in f["field_findings"].items()}
        serializable.append(f_copy)

    output_path.write_text(json.dumps(serializable, ensure_ascii=False, indent=2))
    print(f"\n💾 Detailní výsledky uloženy do {output_path}")


if __name__ == "__main__":
    main()
