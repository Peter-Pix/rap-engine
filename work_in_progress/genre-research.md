# research/genre-research.md
## Sub-žánrová analýza — Výzkum 2026-06-06

### Zdroje dat
- **Wikipedia CS** — úvodní odstavce rapperů
- **MusicBrainz API** — tagy od komunity
- **Deezer API** — genre_id u alb
- **Vlastní DB** — stávající přiřazení žánrů k albům

---

## ✅ JISTÉ PŘIŘAZENÍ (mám data z 2+ zdrojů)

### Yzomandias
- **Z Wiki:** "český rapper a vlastník Milion+" + zmínka o trap kultuře
- **Z DB:** hip-hop(9), trap(7), melodic-trap(2), electronic-rap(2)
- **Z MusicBrainz:** hip hop, drill, trap
- **Z fakta:** CEO Milion+, největší český trap label
- **→ Primární: trap, hip-hop, drill**
- **Doplňkově:** melodic-trap, hardcore-rap

### Calin
- **Z Wiki:** "český zpěvák RnB a rapper s moldavskými kořeny"
- **Z DB:** melodic-rap(2), rnb(2), pop-rap(1)
- **→ Primární: rnb, melodic-rap, pop-rap**

### Ektor
- **Z DB:** hip-hop(3), street-rap(3), hardcore-rap(2), trap(2)
- **+ veřejně známý:** hardcore, street rap, detektor styl
- **→ Primární: street-rap, hardcore-rap, trap**

### Rytmus
- **Z Wiki:** "slovenský rapper"
- **Z DB:** hip-hop(8), rnb(1)
- **+ veřejně známý:** komerční rap, pop-rap
- **→ Primární: hip-hop, pop-rap, mainstream-rap**

### Hugo Toxxx
- **Z Wiki:** "český rapper, hip-hopová scéna"
- **Z DB:** hip-hop(4)
- **+ známý pro:** kontroverzní texty, hardcore
- **→ Primární: hip-hop, hardcore-rap**

### Separ
- **Z DB:** hip-hop(6)
- **+ známý:** Milion+, trap, street
- **→ Primární: hip-hop, trap, street-rap**

### Kato (DJ Kato)
- **Z DB:** electronic-rap(8), czech-pop(1)
- **+ známý:** DJ, producent, elektronika
- **→ Primární: electronic-rap, czech-pop**

### DJ Wich
- **Z Wiki:** "hudební producent a DJ česko-slovenské hip-hopové scény"
- **Z DB:** hip-hop(9)
- **→ Primární: hip-hop, electronic-rap, instrumental-rap**

### Nik Tendo
- **Z DB:** hip-hop(6)
- **Z Wiki:** "český rapper, Milion+"
- **→ Primární: hip-hop, trap, melodic-trap**

### Maniak
- **Z DB:** hip-hop(1) (málo tagovaná alba)
- **Z MusicBrainz:** (nenalezen)
- **Z Deezer:** album genre_id=113 = Taneční hudba
- **→ Primární: hip-hop (nedostatek dat pro přesnější určení)**

### Sergei Barracuda
- **Z DB:** trap(3), street-rap(2), melodic-trap(1)
- **+ známý:** Milion+, trap scéna
- **→ Primární: trap, street-rap**

### Smack (Milion+)
- **Z DB:** grime(3), electronic-rap(1), experimental-rap(1), uk-rap(1)
- **+ známý:** producent, experimentální zvuk
- **→ Primární: grime, experimental-rap, electronic-rap**

### H16
- **Z DB:** hip-hop(3), electronic-rap(1)
- **Z Wiki:** (SK skupina)
- **→ Primární: hip-hop**

### Lipo
- **Z DB:** czech-pop(4)
- **→ Primární: czech-pop (je to spíš pop než rap)**

### Marpo
- **Z DB:** rock-rap(2), country-rap(1), southern-rap(1)
- **+ známý:** rock crossover
- **→ Primární: rock-rap**

### Paulie Garand
- **Z Wiki:** "český rapper a producent"
- **Z DB:** boom-bap(1), hip-hop(1)
- **+ známý:** old-school, boom bap, Ty Nikdy Label
- **→ Primární: hip-hop, boom-bap**

### Decky
- **Z Wiki:** "český rapper"
- **Z DB:** (—) žádný žánr přiřazen
- **→ Primární: hip-hop (nedostatek dat)**

### Idea
- **Z DB:** boom-bap(1), hip-hop(1)
- **→ Primární: hip-hop, boom-bap**

---

## ⚠️ NEJISTÉ / NEDOSTATEK DAT (neměnit)

- **James Cole** — 37 alb, 0 žánrů. Na Deezeru mix Rap/Hip Hop + Electro. Nedostatek dat.
- **Bobby Blaze** — 11 alb, 0 žánrů. Nenalezen na Deezeru.
- **DJ Fatte** — 17 alb, 0 žánrů. Host na 134 trackách. Nedostatek dat.
- **Rest** — 2 alba. boom-bap(1), hip-hop(1). Nízká důvěra.
- **Vladimir 518** — 4 alba. hip-hop(4), rnb(1). Kmenový PSH, ale málo dat.
- **Orion** — 7 alb. hip-hop(1). Kmenový PSH, ale bez žánrových dat.
- **Lvcas Dope** — czech-rap(1), underground-rap(1), dark-rap(1). Málo vzorků.
- **Nobodylisten** — žádná alba jako rapper. Producent/Milion+.

---

## 📊 ŽÁNRY K DOPLNĚNÍ (s jistotou)

### U těchto rapperů můžu s jistotou doplnit genre k album, které ho nemá:

1. **Yzomandias** → trap (hlavně alba po 2018)
2. **Calin** → rnb, melodic-rap
3. **Ektor** → street-rap, hardcore-rap (detektor styl)
4. **Kato** → electronic-rap
5. **DJ Wich** → hip-hop, electronic-rap
6. **Rytmus** → hip-hop, pop-rap
7. **Separ** → hip-hop, trap
8. **Nik Tendo** → hip-hop, trap
9. **Sergei Barracuda** → trap
10. **Smack** → experimental-rap, grime, electronic-rap
11. **H16** → hip-hop
12. **Lipo** → czech-pop
13. **Marpo** → rock-rap
14. **Prezident Lourajder** → hip-hop
15. **Miky Mora** → hip-hop
16. **Nerieš** → hip-hop
17. **Sima** → hip-hop
18. **Zayo** → dancehall (potvrzeno DB)

**Celkem: 18 rapperů s jistými daty →~150 alb k doplnění**