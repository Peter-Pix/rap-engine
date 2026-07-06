## Review: Nové mood entity — 6. 7. 2026

**Zdroj:** Dangling references z RapMonitor importu (batch-import-tracks.ts)
**Celkem:** 10 mood entit
**Root cause:** Anglické tagy prošly přímo jako entity ID, ale entity neexistují

---

### Existující moods (pro kontext)

| ID | Title | Popis |
|----|-------|-------|
| mood_abstract | Abstract | Experimentální, nekonvenční |
| mood_atmospheric | Atmospheric | Náladová, prostorová |
| mood_chill | Chill | Uvolněná, relaxační |
| mood_club | Club | Klubová, taneční |
| mood_confident | Confident | Sebevědomá |
| mood_dark | Dark | Temná, ponurá |
| mood_emotional | Emotional | Emocionální |
| mood_lofi | Lofi | Nízkofidelity, raw |
| mood_melancholic | Melancholic | Melancholická |
| mood_night | Night | Noční |
| mood_positive | Positive | Pozitivní, optimistická |
| mood_raw | Raw | Syrová, nefiltrovaná |
| mood_romantic | Romantic | Romantická |

---

### Návrh: 10 nových mood entit

| ID | Title | Návrh popisu | Akce | Poznámka |
|----|-------|--------------|------|----------|
| mood_aggressive | Aggressive | Agresivní, útočná nálada | ✅ Vytvořit | Odlišné od style_aggressive (ten je o stylu rapu, ne o náladě) |
| mood_calm | Calm | Klidná, vyrovnaná nálada | ✅ Vytvořit | — |
| mood_catchy | Catchy | Chytlavá, zapamatovatelná | ⚠️ Review | Může být duplicitní s style_catchy? Ne, mood je o pocitu, style o struktuře |
| mood_defiant | Defiant | Vzdorová, rebelantská | ✅ Vytvořit | — |
| mood_energetic | Energetic | Energická, dynamická | ⚠️ Review | Podobná mood_club? Ne, club je specifická situace, energetic je obecnější |
| mood_euphoric | Euphoric | Eufortická, euforická | ✅ Vytvořit | — |
| mood_gritty | Gritty | Drsná, špinavá, real | ✅ Vytvořit | Blízká mood_raw, ale gritty je víc o atmosféře ulice |
| mood_playful | Playful | Hravá, lehká | ✅ Vytvořit | Odlišná od theme_humor |
| mood_proud | Proud | Hrdá, pyšná | ✅ Vytvořit | Blízká mood_confident, ale proud je emocionálnější |
| mood_thoughtful | Thoughtful | Přemýšlivá, zamyšlená | ✅ Vytvořit | Blízká mood_introspective, ale introspective je spíš style |

---

### Otázky k zamyšlení

1. **mood_catchy** — Má vůbec smysl jako mood? "Chytlavost" není nálada, je to spíš vlastnost skladby. Možná přesměrovat na style_catchy nebo úplně smazat z track relations?

2. **mood_energetic** vs mood_club — Club je specifická situace (klub, party), energetic je obecnější energie. Rozdíl je vnímatelný, ale je dostatečný? Nebo sloučit?

3. **mood_gritty** vs mood_raw — Raw je o produkci (nefiltrovaný zvuk), gritty je o atmosféře (ulice, realita). Rozdíl je, ale je významný?

4. **mood_proud** vs mood_confident — Confident je sebejistota, proud je hrdost. V rapu často synonymní, ale proud je silnější emoce.

---

### Doporučení

| Akce | Počet |
|------|-------|
| ✅ Vytvořit (bez výhrad) | 7 |
| ⚠️ Review nutný | 3 (catchy, energetic, gritty) |

**Návrh:** Vytvořit všech 10, ale u catchy/energetic/gritty doplnit do popisu jasnou definici, čím se liší od podobných existujících.

---

### Alternativa: Sloučit místo vytváření

Místo 10 nových moods můžeme některé sloučit:

| Dangling | Existující | Rozhodnutí |
|----------|-----------|------------|
| mood_energetic | mood_club | ❌ Ne, jsou odlišné |
| mood_gritty | mood_raw | ❌ Ne, raw = produkce, gritty = atmosféra |
| mood_catchy | — | ❌ Smazat z relations? Není to mood. |

---

**Potřebuju rozhodnutí:**
1. Vytvořit všechny 10 moods?
2. Nebo některé sloučit/přesměrovat?
3. Má `mood_catchy` vůbec smysl?
