# Log změn a kvality labelů

## Formát

Každý záznam má:
- **Label**: který label byl upraven
- **Datum**: kdy byly změny provedeny
- **Změny**: co bylo přidáno/opraveno
- **Kvalita**: ohodnocení 1-10 s odůvodněním

---

## Záznamy

### 2026-06-08 — Rychlí Kluci, ZNK, Ty Nikdy

**Změny:**
- ZNK: z 1 řádku description → 2100+ znaků s historií (2008, Rumburk), horrorcore estetikou, klíčovými postavami (Řezník), kontroverzemi, významem na scéně
- Rychlí Kluci: z 1 řádku description → 2600+ znaků s historií (2019, Praha), spojením s Mike Roft, uměleckým směrem (melodický rap, R&B), klíčovými interprety (Calin, Stein27, Kojo), komerčním úspěchem
- Ty Nikdy: z 2 řádků → 3700+ znaků s detailní historií (2006, Zlín, Idea + DJ Fatte), boom bap tradicí, 7 klíčovými interprety, významem pro český hip hop, DIY etikou

**Kvalita: 8/10**

**Důvody:**
- Silný obsah s konkrétními fakty, kontextem a analýzou významu
- Správný frontmatter (founded, location, description, artists, publishedAt, updatedAt)
- Interlinky na interprety
- Lokální build prošel bez errorů
- Všechny 3 labely mají odlišný, autentický tón odpovídající jejich stylu

**Slabiny / co by se dalo vylepšit:**
- ZNK: chybí konkrétní data vydaných alb (názvy, roky)
- Rychlí Kluci: datum založení je odhad (~2019), ne ověřené
- Ty Nikdy: některé detaily (např. přesný ročník prvního vydání) by potřebovaly externí ověření
- U všech labelů: chybí reference na zdroje (Wikipedia, oficiální stránky, rozhovory)
- Mohly by se přidat fotky, sociální sítě, aktuální webové stránky labelů

**Kontext pro příště:**
- ZNK: horrorcore legenda, Řezník = klíčová postava, kontroverzní historie se zákonem, silná mezinárodní pověst v horrorcore komunitě
- Rychlí Kluci: moderní label, vznik z party kamarádů, Calin = nejstreamovanější český interpret, POPSTAR = zlomový album
- Ty Nikdy: pionýr českého boom bapu, Zlín ≠ tradiční rapové centrum, Idea + DJ Fatte = pilíře, komunitní DIY etika

**Klíčová zjištění pro další labely:**
- Label profily by měly obsahovat: historii založení, zakladatelé, klíčoví interpreti s interlinky, umělecký směr, diskografie/významné projekty, význam na scéně, aktuální stav
- Délka 2000-4000 znaků je ideální (dostatek kontextu, ne moc dlouhé)
- Odlišný tón podle typu labelu: ZNK = temný/kontroverzní, Rychlí Kluci = moderní/optimistický, Ty Nikdy = respekt/tradice

---

## Budoucí plán

- [ ] Doplnit další významné labely (Milion+, Blakkwood, BiggBoss, 1000+ Records...)
- [ ] Přidat fotky, reference na sociální sítě, oficiální weby
- [ ] Ověřit externími zdroji data, u kterých máme odhady
- [ ] Přidat sekci "Diskografie" s konkrétními alby
- [ ] Vytvořit template pro rychlé vyplňování nových labelů
- [ ] Synchronizovat artist list v label MDX s realitou (přidat chybějící, odstranit neaktuální)
