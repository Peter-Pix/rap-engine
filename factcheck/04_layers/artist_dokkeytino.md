# Fact-Check: Dokkeytino — Layer 4: Combined Analysis

**Date:** 2026-06-21
**AI Suspicion Score:** 5 (from scan-ai-hallucinations.py)
**Unknown Names:** 15 (all false positives — phrase fragments)
**Final Verdict:** ⚠️ LOW SUSPICION — mostly correct, missing data

---

## Layer 1: AI Hallucination Scan

| Metric | Value |
|--------|-------|
| Suspicion score | 5/10 |
| Marketing clichés | 3 ("vizionář", "změnil pravidla hry", "architekt zvuku") |
| Superlatives | 2 ("nejvíce vizionářských", "naprosto nepředvídatelná") |
| Unknown names | 15 (all false positives — see below) |

**Unknown names analysis:** All 15 "unknown names" are fragments of phrases, not actual people:
- "Nové Mesto nad Váhom" → split into fragments
- "Tino Entertainment" → label name
- "Def Jam Recordings Slovakia" → label name
- "Traphouse" → studio name
- Various song title fragments

**Verdict:** ⚠️ Elevated suspicion score due to marketing language, but no actual hallucinated facts found.

---

## Layer 2: External Source Verification

| Source | Status |
|--------|--------|
| Wikipedia (sk) | ✅ Available, matches DB |
| Discogs | ✅ Available, matches DB |
| Spotify | ✅ Available, matches DB |
| Refresher interview | ✅ Available, matches DB |
| Red Bull article | ✅ Available, matches DB |

**Verdict:** ✅ All external sources confirm DB data. No fabricated facts.

---

## Layer 3: Data Errors

| Error | Severity | Type |
|-------|----------|------|
| Missing `partOf: Justice44` | 🔴 CRITICAL | Missing data |
| Missing `occupation: producer` | 🟡 MINOR | Incomplete data |
| shortTag "moravská příchuť" | 🟡 MINOR | AI hallucination |
| Duplicate location | 🟡 MINOR | Data quality |

**Verdict:** 1 critical error (missing crew), 3 minor issues.

---

## Layer 4: Overall Assessment

**Dokkeytino is LOW RISK.** The AI suspicion score of 5 is inflated by marketing language in profile.json, not by actual fabricated facts. The only real issue is missing data (Justice44 crew, producer occupation).

**Recommendation:**
1. ✅ Fix `partOf` in relations.json (add Justice44)
2. ✅ Fix `occupation` in meta.json (add "producer")
3. ✅ Fix `shortTag` (remove "moravská příchuť")
4. ✅ Deduplicate locations
5. ❌ Skip creating Justice44 entity (scope: fact-check, not entity creation)

---

## Comparison with Other Fact-Checked Artists

| Artist | Suspicion | Critical Errors | Minor Errors | Verdict |
|--------|-----------|----------------|--------------|---------|
| Ektor | 8 | 2 | 2 | 🔴 HIGH |
| Viktor Sheen | 7 | 2 | 2 | 🔴 HIGH |
| Rest | 6 | 0 | 1 | 🟡 MEDIUM |
| DJ Wich | 5 | 0 | 1 | 🟡 MEDIUM |
| Vladimir 518 | 5 | 0 | 1 | 🟡 MEDIUM |
| LA4 | 6 | 1 | 2 | 🟡 MEDIUM |
| **Dokkeytino** | **5** | **1** | **3** | **🟡 MEDIUM** |
