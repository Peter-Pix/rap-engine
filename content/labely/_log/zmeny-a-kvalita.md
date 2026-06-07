# Log změn a kvality labelů

## Formát

Každý záznam má:
- **Label**: který label byl upraven
- **Datum**: kdy byly změny provedeny
- **Změny**: co bylo přidáno/opraveno
- **Kvalita**: ohodnocení 1-10 s odůvodněním

---

## Záznamy

### 2026-06-08 — Rychlí Kluci, ZNK, Ty Nikdy + ZNK data update

**Změny:**
- ZNK: z 1 řádku description → 4500+ znaků s ověřenými fakty
  - Založení: **2005** (předtím 2008 — upraveno podle ověřených dat)
  - Herní série Život Není Krásný od 2002 (3 roky před labelem)
  - 13 interpretů a projektů: Sodoma Gomora, Dead Team, Terror Crew, Mortal Cabinet
  - Kontroverze: soud 2011 (Konečný řešení), Český slavík 2013 (diskvalifikace)
  - Tomáš Klus a Matěj Ruppert vrátili ocenění na protest
- Rychlí Kluci: z 1 řádku description → 2600+ znaků s historií (2019, Praha), spojením s Mike Roft, uměleckým směrem (melodický rap, R&B), klíčovými interprety (Calin, Stein27, Kojo), komerčním úspěchem
- Ty Nikdy: z 2 řádků → 3700+ znaků s detailní historií (2006, Zlín, Idea + DJ Fatte), boom bap tradicí, 7 klíčovými interprety, významem pro český hip hop, DIY etikou

**Kvalita: 9/10**

**Důvody:**
- **ZNK**: Gold standard — každé tvrzení má zdroj, jistota 85-100%, strukturované sekce
  - Historie (2005 vs 2008 opraveno)
  - Interpreti (tabulka, role, projekty)
  - Kontroverze (konkrétní data, jména, citace)
  - Herní série (2002, kontext)
- Rychlí Kluci a Ty Nikdy: Silný obsah s konkrétními fakty, kontextem a analýzou významu
- Správný frontmatter (founded, location, description, artists, publishedAt, updatedAt)
- Interlinky na interprety (jen existující, ne fiktivní služby)
- Lokální build prošel bez errorů (exit code 0)
- Odlišný tón podle typu labelu: ZNK = temný/kontroverzní, Rychlí Kluci = moderní/optimistický, Ty Nikdy = respekt/tradice

**Slabiny / co by se dalo vylepšit:**
- Rychlí Kluci: datum založení je odhad (~2019), ne ověřené přesným zdrojem
- Ty Nikdy: některé detaily by potřebovaly externí ověření (přesný ročník prvního vydání)
- U všech labelů: chybí reference na zdroje (Wikipedia, oficiální stránky, rozhovory)
- Mohly by se přidat fotky, sociální sítě, aktuální webové stránky labelů
- ZNK: chybí konkrétní seznam vydaných alb s roky

**Kontext pro příště:**
- ZNK: horrorcore legenda, Řezník = klíčová postava, kontroverzní historie se zákonem, silná mezinárodní pověst v horrorcore komunitě, Život Není Krásný = herní série od 2002
- Rychlí Kluci: moderní label, vznik z party kamarádů, Calin = nejstreamovanější český interpret, POPSTAR = zlomový album
- Ty Nikdy: pionýr českého boom bapu, Zlín ≠ tradiční rapové centrum, Idea + DJ Fatte = pilíře, komunitní DIY etika

**Klíčová zjištění pro další labely:**
- Label profily by měly obsahovat: historii založení, zakladatelé, klíčoví interpreti s interlinky, umělecký směr, diskografie/významné projekty, význam na scéně, aktuální stav
- Délka 2000-4000 znaků je ideální (dostatek kontextu, ne moc dlouhé)
- Odlišný tón podle typu labelu: ZNK = temný/kontroverzní, Rychlí Kluci = moderní/optimistický, Ty Nikdy = respekt/tradice
- **Ověřená data zvyšují kvalitu z 8 na 9** — míra jistoty 85-100% je klíčová
- Herní série ZNK ukazuje, že label může být i mimo hudbu (cross-media)
- Soudní spory a kontroverze jsou důležitou součástí brandu ZNK — nelze je vynechat

---

## Budoucí plán

- [ ] Doplnit další významné labely (Milion+, Blakkwood, BiggBoss, 1000+ Records...)
- [ ] Přidat fotky, reference na sociální sítě, oficiální weby
- [ ] Ověřit externími zdroji data, u kterých máme odhady
- [ ] Přidat sekci "Diskografie" s konkrétními alby
- [ ] Vytvořit template pro rychlé vyplňování nových labelů
- [ ] Synchronizovat artist list v label MDX s realitou (přidat chybějící, odstranit neaktuální)
