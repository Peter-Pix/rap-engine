# Plán: Vylepšení "Porovnat rapery" (12. 10. 2026)

## Aktuální stav (po Fázi A+B — funguje dobře)
Porovnat rapery už má:
- Přímé shody (žánr/styl/nálada/téma/label/scéna/lokalita)
- Společné skladby (s rolemi autor/host)
- Nepřímé propojení (bidirectional BFS "spojuje je X")
- Slovní verdikt ("Skoro dvojčata", "Solidní překryv"...)

Po Fázi A (propagace track→artist) dává porovnání BOHAČTÉ výsledky:
- Ektor vs Yzomandias: 47 shod (16 nálad, 21 témat, 7 žánrů)

## Co je ještě "kostrbaté" → návrh vylepšení

### 1. Skóre podobnosti (0-100%) ⭐ NEJVYŠŠÍ hodnota
Teď jen "společných vazeb: N" + slovní verdikt. Chybí číselné skóre.
- Vážené skóre: žánr=3, styl=2.5, nálada=2, téma=1.5, label=2, scéna=2, lokalita=1
- Normalizovat na 0-100 (podle max možného)
- Ukázat jako velké číslo + progress bar (zlatý akcent)

### 2. Statistiky obou rapperů (side-by-side)
Teď chybí základní kontext. Přidat vedle sebe:
- Počet tracků, alb, featurů
- Aktivní od (activeSince)
- Label, scéna, původ (origin)
- Status (aktivní/neaktivní)

### 3. Rozlišení "podobnost" vs "spolupráce"
Teď se mísí žánr (podobnost) s feat (spolupráce). Rozdělit:
- Sekce "Jak jsou si podobní" (žánr/nálada/téma/styl)
- Sekce "Jak spolupracují" (společné skladby, label, scéna, kolaborace)

### 4. Vylepšení nepřímého propojení
Teď se BFS počítá jen když NENÍ přímá shoda. Zobrazit "společný kontakt"
i u dvojic s přímou shodou (jako doplněk), pokud je to zajímavé.

### 5. Prázdný stav
Když nic není, teď jen "zkus jinou dvojici". Přidat "nejbližší propojení"
(top 3 artisty, kteří mají s oběma něco společného).

## Pořadí
1 → 2 → 3 (nejvyšší hodnota, pak statistiky, pak sémantické rozdělení)

## Bezpečnost
- Skóre = čistě z existujících vazeb (deterministické, testovatelné)
- Statistiky = čtení z meta (žádný nový zápis)
- Žádná změna dat — jen UI/algoritmus na straně common-ground.ts + PorovnatClient.tsx
