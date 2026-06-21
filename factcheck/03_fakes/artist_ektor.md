# FAKES / ERRORS — Ektor

> Identifikované chyby, fake claims a AI halucinace v produkčních datech entity `artist_ektor`.
> **Datum auditu**: 2026-06-20
> **Source**: `factcheck/01_raw/artist_ektor/{meta,profile,relations}.json`
> **Pravidlo**: Tady identifikuju chyby. Produkční data NEMĚNÍM — jen zapisuju.

---

## 🔴 F1: shortTag obsahuje faktickou chybu (Brno vs Dobřichovice)

**Kde**: `content/entities/artist_ektor/profile.json` → `shortTag`

**Co tvrdí shortTag**:
> "Moravský těžkej kalibr. **V Brně se nezastavil, v Praze se prosadil.**"

**Co říkají interní data** (`meta.json`):
```json
{
  "origin": "Praha (Dobřichovice)",
  "city": "Praha"
}
```

**Problém**:
- Ektor je z **Dobřichovic** (obec u Prahy), ne z **Brna**.
- Žádný jiný field v profilu nezmiňuje Brno.
- Profil ho popisuje jako "pražský drill", "pražské haly" — vše ukazuje na Prahu, ne Moravu.
- "Moravský těžkej kalibr" je **chybný claim**.

**Důvod chyby**: shortTag byl zřejmě opsán ze šablony pro jiného rappera (možná Maniak, viz podobný styl "Brno není Praha"). Copy-paste chyba.

**Doporučení pro opravu**:
- Varianta A: "Pražská jistota. V Dobřichovicích to rozjel, v O2 aréně to završil."
- Varianta B: "První sólový rapper na O2 areně. Detektor je jeho brand."
- Varianta C: "Dvě dekády klubových bangerů. Ektor není rapper, je to instituce."

**Status**: ❌ FAKE claim v user-facing content

---

## 🟡 F2: Nekonzistentní datum debutu (Ametyst 2008 vs Topství 2011)

**Kde**: 
- `profile.json` → `keyAlbums[0]` → Ametyst, 2008 (debut)
- `meta.json` → `note` → "Debut Topství (2011)"
- `profile.json` → `careerSummary` → "Od undergroundového debutu **Ametyst s producentem Enemym** se vypracoval..."
- `relations.json` → `albums` → **Topství** (2011), ale **Ametyst chybí!**

**Problém**:
- Interní nekonzistence: profile.json říká debut = Ametyst (2008), ale meta.json říká debut = Topství (2011).
- **Ametyst není v relations** — takže album pravděpodobně neexistuje v DB.
- Pokud Ametyst neexistuje, tak **careerSummary je fake**.

**Status**: ⚠️ INTERNÍ NEKONZISTENCE — vyžaduje cross-check s Discogs/Wikipedia

---

## 🟡 F3: Nekonzistentní activeSince (2007 vs 2008)

**Kde**:
- `meta.json` → `"activeSince": "2008"`
- `meta.json` → `"note": "Aktivní od 2007"`

**Status**: ⚠️ Minor — ale mělo by se sjednotit

---

## 🟡 F4: Pracně formulovaný generický text (podezření na AI halucinaci)

**Kde**: `profile.json` → `careerSummary`, `whatMakesUnique`, `shortIntro`

**Příklad (careerSummary)**:
> "Od undergroundového debutu Ametyst s producentem Enemym se vypracoval v nejúspěšnějšího sólového rappera v Česku. Zlom přišel s albem Tetris (2012), kde ve spolupráci s DJ Wichem zabetonoval svou pozici na vrcholu. Následovala éra Detektor, která z něj udělala komerční fenomén a majitele vlastního labelu a merche."

**Pattern**:
- Slova jako "nejúspěšnější sólový rapper", "komerční fenomén", "vyprodat největší haly" — marketingový žargon
- Žádný konkrétní zdroj (čísla, data, jména novinářů)
- "Zlom přišel", "Následovala éra" — struktura copywritingu

**Status**: ⚠️ Podezření na AI generování. Nemám primary source pro tyto claimy.
- "První český sólový rapper na O2 areně" — tohle by mělo jít ověřit (datum, statistiky)
- "3× platina" u Detektor trilogie — musí mít primary source (snad ČNS IFPI)

**Akce**: Layer 3 (Wikipedia cs, oficiální Detektor Records web)

---

## 🟢 OK

- **Real name** (Marko Elefteriadis) — unikátní řecké jméno, dobře ověřitelné
- **Label** (Detektor Records) — overitelný, je to veřejná entita
- **Style tags** (Alpha Rap, Club Bangers) — subjektivní, nevyžaduje verify
- **Sources array** — existují 5 URLs, ale nekontroloval jsem je

---

## 📋 Co dál

1. **Layer 2**: Cross-reference — existuje v DB `album_ametyst`? Mrknu do relations a cache.
2. **Layer 3**: Wikipedia cs (Marko Elefteriadis, Ektor rapper)
3. **Layer 4**: Discogs (Ektor discography)
4. **Layer 5**: Oficiální web Detektor Records (detektorrecords.cz)

**ETA**: 30-45 min na celý audit
---

## 🟡 F5: Podezřelé roky v Ektorových albech (NEověřeno)

**Kde**: `extraMeta.year` v Ektorových albech

**Pattern** (subjektivní, NEEDS VERIFICATION):
- Tetris: DB = 2024 (podezřelé, můj odhad = 2012)
- Detektor: DB = 2011 (podezřelé, můj odhad = 2015)
- Detektor II: DB = 2023 (podezřelé, můj odhad = 2016)
- Marko: DB = 2019 (podezřelé, můj odhad = 2018)

**⚠️ DŮLEŽITÉ**: Moje paměť může být špatná. Nemám primary source.
- Nutná verifikace přes Wikipedia cs, Discogs, oficiální web Detektor Records.
- Pokud DB rok je správně, **já se pletu**. Pokud DB je špatně, je to bug.

**Akce**: Layer 3+

**Status**: ⚠️ POTŘEBA OVĚŘENÍ — ne automaticky fake

---

## 🟡 F6: Detektor Records label founding date — interní konflikt

**Kde**: 
- `label_detektor-records` description: "...vydává svou tvorbu **od roku 2015**"
- `album_topstvi` (2011) description: "Deska vyšla pod labelem Detektor Records"

**Konflikt**: 
- Pokud Topství (2011) bylo pod Detektor Records, label existoval od **nejpozději 2011**.
- Label description tvrdí "od roku 2015" = label založen 2015.

**⚠️ Stejné pravidlo**: Interní nekonzistence, ale **kdo je špatně** — label description, nebo album description? Potřebuje primary source.

**Akce**: Layer 3+

**Status**: ⚠️ POTŘEBA OVĚŘENÍ

---

## 🔴 F7: Album Detektor má špatný rok v DB (2011 místo 2015)

**Kde**: `content/entities/album_detektor/meta.json` → `publishedAt`

**Co říká DB**: `publishedAt: "2011-01-01"`

**Co říká Discogs** (master ID 1938693, role Main): **2015**

**Co říká profile.keyAlbums**: **2015**

**Cross-reference**:
- `album_topstvi.description` tvrdí „Ektor v roce 2011 vydal své DRUHÉ album"
- Pokud Topství = 2. album, debut bylo něco jiného (Ametyst 2008?) — NE Detektor
- Discogs potvrzuje Detektor = 2015

**Důvod chyby**: `publishedAt` v DB je zřejmě chybně naplněn při importu. Profil + Discogs se shodují na 2015.

**Doporučení pro opravu**: `publishedAt` by mělo být `2015-01-01` (nebo přesné datum vydání).

**Status**: ❌ DATA ERROR v user-facing content (sitemap, Schema.org datePublished)

---

## 🔴 F8: Album Detektor II má hodně špatný rok v DB (2023 místo 2016)

**Kde**: `content/entities/album_detektor-ii/meta.json` → `publishedAt`

**Co říká DB**: `publishedAt: "2023-01-01"`

**Co říká Discogs** (master ID 1938702, role Main): **2016**

**Cross-reference**:
- Detektor trilogie: 2015 → 2016 → 2023. **Sedí** — Detektor III (2023) je po 7 letech, ne po 1.
- DB uvádí Detektor II 2023, těsně před Detektor III (2023) — to **nedává smysl** (albumy vycházejí s odstupem, ne ve stejném roce).

**Důvod chyby**: Zřejmě špatný import, možná kopírován `created_date` z Base44 API namísto roku vydání.

**Doporučení pro opravu**: `publishedAt` by mělo být `2016-01-01` (nebo přesné datum).

**Status**: ❌ DATA ERROR — dramatický rozpor s Discogs

---

## 🟡 F9: Topství má publishedAt 2026 (budoucnost)

**Kde**: `content/entities/album_topstvi/meta.json` → `publishedAt: "2026-05-21"`

**Co říká description**: „Ektor v roce 2011 vydal své druhé album."

**Co říká profile**: Topství není v keyAlbums, ale v relations je zařazen jako první album.

**Problém**:
- publishedAt 2026 je v budoucnosti (nebo velmi nedávné, ale popis jasně říká 2011).
- Zřejmě **importoval se `created_date` z importu** namísto roku vydání.

**Doporučení pro opravu**: `publishedAt` by mělo být `2011-XX-XX`. Rok 2011 je podložen description + logikou (Topství = debut/2. album, před Ametystem 2008 nebo hned po něm).

**Status**: ❌ DATA ERROR — rok v budoucnosti je nesmyslný

---

## 🟡 F10: 8 alb v DB nemá Discogs master release

**Kde**: DB obsahuje 13 alb, Discogs má jen 5 master alb jako role Main.

**Alba chybějící v Discogs**: Topství, Tetris, Alfa, Marko, Figury, Velký hry, 2086, Třetí oko.

**Možnosti**:
1. **Regionální CZ alba** — vydaná jen v ČR/SK, ne na mezinárodním trhu → Discogs je nemá. Vyžaduje primary source (Detektor Records oficiální web, Spotify).
2. **Fake/halucinated alba** — importovaná z AI-generated textu, nikdy neexistovala.
3. **Import chyby** — název/slug v DB neodpovídá skutečnému albu na Discogs.

**Akce**: Layer 4+ — manuální cross-reference s oficiálními zdroji pro každé album.

**Status**: ⚠️ POTŘEBA OVĚŘENÍ — 8/13 alb

---

## 🔴 F11: Ametyst (2008) zmiňovaný v profile.keyAlbums neexistuje

**Kde**: `profile.json` → `keyAlbums[0]` a `careerSummary`

**Co tvrdí profil**:
- keyAlbums[0]: „Ametyst" (2008) — „Prvotina s Enemym, která ukázala syrový talent"
- careerSummary: „Od undergroundového debutu Ametyst s producentem Enemym se vypracoval..."
- note v meta.json: „Debut Topství (2011)" — což je v rozporu

**Cross-reference**:
- ❌ Ametyst **neexistuje v DB** (není v relations ani v content/entities/)
- ❌ Ametyst **neexistuje na Discogs** master releases
- ❌ Ametyst **neexistuje na cs Wikipedii** (stránka neexistuje)
- ✅ Topství.description říká „DRUHÉ album" — takže něco předcházelo

**Pattern**:
- Interně nekonzistentní: note říká debut=Topství, careerSummary říká debut=Ametyst
- Ametyst chybí ve **všech** databázích (DB + Discogs + Wikipedia)
- Enemy (producent) je zmíněn, ale produkoval Ametyst, nikoliv Topství

**Důvod chyby**: Vysoce pravděpodobná **AI halucinace** — careerSummary popisuje narativ („undergroundový debut s Enemym"), který zní věrohodně, ale neodpovídá žádnému ověřitelnému albu.

**Doporučení pro opravu**:
- Varianta A: Smazat zmínku o Ametystu z careerSummary a keyAlbums
- Varianta B: Ověřit existenci Ametystu u Detektor Records a doplnit jako album_xxx entitu
- Varianta C: Pokud Ametyst je bootleg/mixtape, označit jako takový

**Status**: ❌ FAKE claim v user-facing content + AI halucinace

---

## 🟡 F12: Profile.funFacts mate tetu s matkou

**Kde**: `profile.json` → `funFacts[0]`

**Co tvrdí profil**: „Je synem legendární řecké zpěvačky Marthy Elefteriadu."

**Co říká Discogs**: „Son of Czech vocalist of Greek origin [a=Tena Elefteriadu], nephew of [a=Martha Elefteriadu]"

**Problém**:
- Martha je **teta** Ektora, ne matka.
- Matka je **Tena Elefteriadu**.

**Doporučení pro opravu**: „Je synovcem legendární řecké zpěvačky Marthy Elefteriadu a synem zpěvačky Tény Elefteriadu."

**Status**: ⚠️ MINOR ERROR — spletení příbuzenského vztahu

---

## 📊 Souhrnný status Ektor fact-check (2026-06-21)

| Nález | Závažnost | Status |
|-------|-----------|--------|
| F1: shortTag Brno vs Dobřichovice | 🔴 critical | ❌ FAKE |
| F2: Nekonzistentní debut (Ametyst vs Topství) | 🟡 medium | ❌ → F11 |
| F3: activeSince 2007 vs 2008 | 🟢 minor | ⚠️ |
| F4: Generický text v profile | 🟡 medium | ⚠️ needs source |
| F5: Podezřelé roky alb | 🟡 medium | ❌ → F7-F9 |
| F6: Label Detektor Records founding | 🟡 medium | ⚠️ needs source |
| F7: Detektor 2011 vs 2015 | 🔴 critical | ❌ DATA ERROR |
| F8: Detektor II 2023 vs 2016 | 🔴 critical | ❌ DATA ERROR |
| F9: Topství 2026 (budoucnost) | 🔴 critical | ❌ DATA ERROR |
| F10: 8 alb bez Discogs master | 🟡 medium | ⚠️ |
| F11: Ametyst neexistuje | 🔴 critical | ❌ AI HALUCINACE |
| F12: Martha vs Tena (teta/matka) | 🟢 minor | ⚠️ |

**Celkem**: 12 nálezů, z toho **5 critical** (F1, F7, F8, F9, F11), 4 medium, 3 minor.

**Akce**: Opravit F7, F8, F9 okamžitě (data errors ovlivňují sitemap/Schema.org). F11 vyžaduje diskuzi — smazat Ametyst, nebo najít primary source.

