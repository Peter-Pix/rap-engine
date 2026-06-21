# Fact-Check: Dokkeytino — Layer 3: Fakes & Errors

**Date:** 2026-06-21
**Status:** ❌ 1 critical error found

---

## Error #1 (CRITICAL): Missing `partOf` — Justice44 crew

| Field | Current Value | Should Be |
|-------|---------------|-----------|
| `partOf` | `[]` (empty) | `["collective_justice44"]` |

**Evidence:**
- Wikipedia (sk): "Je členom skupiny Justice44" — https://sk.wikipedia.org/wiki/Dokkeytino
- Discogs: Dokkeytino appears on Justice44 releases
- Refresher interview mentions Justice44 crew

**Impact:** Missing crew affiliation breaks the graph. Justice44 is a known collective (Frayer Flexking, Shimmi, Dokkeytino, etc.).

**Fix required:** Add `partOf: ["collective_justice44"]` to relations.json. Also need to create `collective_justice44` entity if it doesn't exist.

---

## Error #2 (MINOR): Missing `occupation: ["producer"]`

| Field | Current Value | Should Be |
|-------|---------------|-----------|
| `occupation` | `["rapper"]` | `["rapper", "producer"]` |

**Evidence:**
- Multiple interviews confirm he produces his own music
- Discogs lists him as "Producer" role on releases
- Fun fact #1 in profile.json says "produces, mixes and masters his own music"

**Impact:** Minor. Occupation field is incomplete.

**Fix:** Add "producer" to occupation array in meta.json.

---

## Error #3 (MINOR): shortTag is nonsensical

| Field | Current Value |
|-------|---------------|
| `shortTag` | "Slovenskej rapper s moravskou příchutí. Dokkeytino spojuje." |

**Issue:** "Slovenskej rapper s moravskou příchutí" — Dokkeytino is from Nové Mesto nad Váhom (Slovakia), not Moravia. The "moravská příchuť" is AI hallucination.

**Fix:** Rewrite shortTag to something accurate.

---

## Error #4 (MINOR): Duplicate locations in relations.json

| Field | Current Value |
|-------|---------------|
| `locations` | `["location_nove-mesto-nad-vahom", "location_nove-mesto-nad-vahom", "location_slovensko"]` |

**Issue:** `location_nove-mesto-nad-vahom` appears twice.

**Fix:** Deduplicate.

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 1 | Missing Justice44 crew (partOf) |
| 🟡 MINOR | 3 | Missing producer occupation, bad shortTag, duplicate location |
| ✅ OK | 0 | No false data found (only missing data) |
