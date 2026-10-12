# Plán: Audit kolaborací (web-ověřeno) — 12. 10. 2026

## Metoda
Vyhledat nejznámější CZ/SK rap kolaborace → porovnat s DB → doplnit, co chybí.
Pravidlo: OVĚŘIT přes web (ne spoléhat na paměť — moje znalost byla 2× chybná).

## Zjištění: DB je překvapivě kompletní
- 22 známých párů → 18 v DB (track/related), 4 "chyběly" (z toho 2 byl můj
  špatný předpoklad).
- Skupiny mají správné členy (RELATED_ARTIST z collective.artists):
  DMS=Separ+Dame+Smart, Kontrafakt=Ego+Rytmus+DJ Anys, 58G, Supercrooo, TroubleGang.

### Moje chyby (důležité poučení)
1. **Separ↔Ego NENÍ duo** — Ego je v Kontrafaktu (s Rytmusem), Separ v DMS
   (s Dame+Smart). Jsou z RŮZNÝCH skupin.
2. **DMS** = Dame+Monsignor Separ+DJ Smart (ne "Separ+Ego").

## Skutečné díry (ověřeno webem) — feat tracky chybí
1. **Koky ↔ Nik Tendo** (Milion+):
   - "Zatím Co Vy" (Koky album "Stát Ve Stínu", 2021)
   - "365247" (feat. Koky, 2020, ISRC CZUM72000586)
2. **Gleb ↔ Nik Tendo** (Milion+) — feat tracky chybí
3. **Pil C ↔ Sergei Barracuda** — feat tracky chybí

## Závěr
DB nemá problém s VAZBAMI (kolaborace mezi existujícími artisty jsou OK),
ale s CHYBĚJÍCÍMI TRACKY (feat skladby, které nejsou importované).

## Další kroky (k rozhodnutí)
1. Dohledat přesně, které feat tracky chybí (systematicky, ne ad hoc).
2. Importovat chybějící feat tracky (Deezer ID-based, ne name match).
3. Zvážit: je priorita tracky, nebo stačí RELATED_ARTIST vazby mezi
   členy Milion+ crew (Koky/Nik Tendo/Gleb/Yzomandias)?
