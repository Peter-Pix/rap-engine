# Audit slabých míst + plán zaplnění | 2026-10-11

> **Metoda:** skripty proti reálným datům (entities.json, graph.json, tracks.json).
> **Stav:** 5 796 entit · 33 703 hran

---

## 1. AUDIT — kde data reálně chybí

### 🔴 P0 — Kritické (kontaminace dat)

| # | Problém | Rozsah | Dopad |
|---|---|---|---|
| **1** | **Cizí tracklisty na albech** | **170 alb** (z 529 s `tracks.json`) | Foo Fighters na albu Robin Zoota, Taylor Swift na albu Fobia Kid, Gorillaz na albu Arleta… **Nikdy neimportovat!** |
| **2** | **1 496 skladeb v 160 albech nikdy nepropojeno** | 160 alb | Deezer tracklisty leží ladem — ale **jen po ověření, že patří správnému albu** |

### 🟠 P1 — Velké mezery obsahu

| # | Problém | Rozsah | Zdroj dat |
|---|---|---|---|
| **3** | Tracky bez producenta | **4 411 / 4 509** (97,8 %) | RM: 185 · Discogs · album credits |
| **4** | Tracky bez žánru | **3 172 / 4 509** (70 %) | RM tags_genre · album genres fallback |
| **5** | Entity bez description | **1 729** (1 609 tracků) | AI summary · RM ai_summary_short |
| **6** | Alba bez labelu | **245 / 604** (40 %) | RM label (182) · Discogs · Deezer |
| **7** | Producer entity chybí | 16 v DB vs ~60 v RM (Mike Trafik, Radimo, Enthic…) | RM + Discogs |

### 🟡 P2 — Střední

| # | Problém | Rozsah |
|---|---|---|
| **8** | Entity bez obrázku | 3 332 (2 746 tracků — obal alba řeší) |
| **9** | Alba bez tracků v grafu | 230 (z toho 70 bez tracklistu vůbec) |
| **10** | Hosté bez artist entity | 11 (rozhodnuto: nechat být) |

---

## 2. DOSTUPNÉ ZDROJE (ověřené)

| Zdroj | Co pokrývá | Stav |
|---|---|---|
| **Rap Monitor API** | producer 185, label 182, spotify 468, youtube 473, album 995, duration 992, ai_analysis 441, lyrics 543 | ✅ `rm-songs.json` na disku |
| **Deezer** (tracks.json) | tracklisty, feat, duration, isrc, label, cover | ✅ 529 alb na disku (⚠️ 170 cizích) |
| **Discogs API** | producenti, labely, roky, credits | ✅ skript `fix-album-years-discogs.py` existuje, bez auth (25 req/min) |
| **Ollama Cloud** | vlastní AI analýza textů | ✅ klíč v `.env.local` |
| **LRCLIB** | texty skladeb | ✅ `lib.ts` (rate-limit ochrana) |
| **YouTube Data/oEmbed** | embed, kanál | ✅ skripty existují |
| **Spotify/Apple Music URL** | odkazy | ✅ z RM |

---

## 3. PLÁN — pořadí podle dopadu/rizika

### FÁZE 0 — Bezpečnostní úklid (POVINNÉ PRVNÍ)
**Cíl:** oddělit cizí tracklisty, aby se neimportovaly.

1. Skript `audit-album-tracklists.ts` — pro každé album s `tracks.json` ověří,
   zda interprety tracků odpovídají interpretovi alba (nebo jsou v RKG jako CZ/SK artist).
2. Rozdělení: `tracks.json` → `tracks.verified.json` (OK) / `tracks.rejected.json` (cizí).
3. Report 170 cizích alb → ruční revize.
**Čas:** 1 h · **Riziko:** nízké (nic se nemění)

### FÁZE 1 — Propojení ověřených tracklistů
**Cíl:** dostat ověřené Deezer skladby do grafu.

1. Pro 160 alb s tracklisty vzniknou track entity (`track_<artist>-<title>`).
2. Content: metadata MDX (bez AI — jen fakta z tracklistu) + `noindex: true`.
3. Feat vazby z `feat[]` (jen existující artist entity).
**Čas:** 2–3 h · **Dopad:** +~1 200 track entit

### FÁZE 2 — Producenti (největší mezera)
**Cíl:** 4 411 tracků bez producenta → doplnit.

1. RM `producer`/`beatmaker` (185 skladeb) → `PRODUCED_BY` vazby.
2. Založit `producer_*` entity pro top producenty z RM (Mike Trafik, Radimo, Enthic, Marcus Tran, Vae Cortez, Special Beatz, Štěpán Turek…).
3. Discogs credits pro alba bez RM dat.
**Čas:** 3–4 h · **Dopad:** velký (SEO + graf)

### FÁZE 3 — Žánry + labely
1. Tracky bez žánru → dědit z alba (`album.genres`).
2. Alba bez labelu → RM label + Discogs.
**Čas:** 1–2 h

### FÁZE 4 — Description + obrázky
1. 1 609 tracků bez description → RM `ai_summary_short` / AI generováno z MDX.
2. 2 746 tracků bez obrázku → dědit obal alba (pokud existuje).
**Čas:** 2 h

---

## 4. DOPORUČENÉ POŘADÍ

```
FÁZE 0 (úklid)  →  FÁZE 1 (propojení)  →  FÁZE 2 (producenti)
     ↓                                          ↓
  1 h, nízké riziko                     3-4 h, velký dopad
                                     FÁZE 3 → FÁZE 4
```

**Total:** ~10–12 h · **Nejvyšší dopad na jeden večer:** FÁZE 0 + 1 (~4 h)

---

## 5. ROZHODNUTÍ K UDĚLÁNÍ

- **D1** — 170 cizích alb: smazat `tracks.json`, nebo přejmenovat na `.rejected`?
  → Návrh: přejmenovat (zachovat pro audit, neztratit data).
- **D2** — Nové track entity z tracklistů: `noindex` dokud nemají obsah?
  → Návrh: ano, `noindex: true` + metadata MDX (stejný pattern jako dnes).
- **D3** — Producent entity: zakládat stub pro každého, nebo jen top 20?
  → Návrh: top 20 s vlastním trackem ≥2, zbytek jako jméno v `extraMeta.producerName`.
