# 🎯 City prompt template — Tier 1 města (top scény, 8 měst)

Pro každé město níže: **zkopíruj master prompt + city data** do GPT. Doporučuju brát po 1-2 městech na jednu konverzaci (lepší kvalita, delší kontext).

---

## Brno (Tier 1, 2-3 kB)
- **Slug:** `brno`
- **Soubor:** `content/entities/location_brno/entity.mdx`
- **Region:** Česko (Morava)

```
# Brno (slug: brno)
Region: Česko
Description (z cache): Hip-hopová scéna v Brno, Česko
Rapperů z města: 12
Rappeři: Annet X, Calin, Daniel Vardan, DJ AKA, Dj Opia, Grey256, Loudz1, Maniak, Michajlov, Robin Tent, Stein27, Tafrob
Alba z města: 67 (top 10: Planeta opic, Bieber Fever, Bieber Fever Tour Life, Black Chinese II, Hello Ibiza, Live @ O2 arena Praha, Menaces & Opportunités, No Album, No Title, POPSTAR)
Žánry města: rap, pop, neo-soul, hip-hop, rnb, pop-rap, afrobeats, uk-garage, emo-rap, street-rap, boom-bap, hardcore-rap
```

---

## Praha (Tier 1, 2-3 kB)
- **Slug:** `praha`
- **Soubor:** `content/entities/location_praha/entity.mdx`
- **Region:** Česko (Čechy)

```
# Praha (slug: praha)
Region: Česko
Description (z cache): Hip-hopová scéna v Praha, Česko
Rapperů z města: (viz location-data-packet.md)
Alba z města: (viz location-data-packet.md)
Žánry města: (viz location-data-packet.md)
```

(Vyhledej Prahu v `location-data-packet.md` pro kompletní seznam.)

---

## Bratislava (Tier 1, 2-3 kB)
- **Slug:** `bratislava`
- **Soubor:** `content/entities/location_bratislava/entity.mdx`
- **Region:** Slovensko

```
# Bratislava (slug: bratislava)
Region: Slovensko
Description (z cache): Hip-hopová scéna v Bratislava, Slovensko
Rapperů z města: 24
Rappeři: Aless, Astral, AstralKid22, Berlin Manson, Čistychov, Dame, Dara Rolins, David Beng Rostaš, Gleb, Kali, Kamil Hoffmann, Kojo, Luca Brassi10x, Majk Spirit, Majself, MOMO, Otecko, Peter Pann, Pil C, Prezident Lourajder, Separ, SHIMMI, Strapo, Tina
Alba z města: 93 (top 10: before FUTUREPUNK, Ilegal Mixtejp, Né produkt, Posledný doberman, ROOTS, Sin Límite vol. 2, Yak Orol, 100RY, Černej kůň, Černej kůň plus)
Žánry města: pop-rap, melodic-trap, cloud-rap, experimental-trap, electronic, alternative-hip-hop, experimental, melodic, new-wave, rage, czech-rap, drill
```

---

## Košice (Tier 1, 2-3 kB)
- **Slug:** `kosice`
- **Soubor:** `content/entities/location_kosice/entity.mdx`
- **Region:** Slovensko (východ)

(Vyhledej Košice v `location-data-packet.md`.)

---

## Ostrava (Tier 1, 2-3 kB)
- **Slug:** `ostrava`
- **Soubor:** `content/entities/location_ostrava/entity.mdx`
- **Region:** Česko (Moravskoslezský kraj)

(Vyhledej Ostravu v `location-data-packet.md`.)

---

## 🌍 Další Tier 1 města (doplň z packetu)

- **Olomouc** (Morava)
- **Plzeň** (západní Čechy)
- **Liberec** (severní Čechy)
- **Zlín** (východní Morava)
- **Nitra** (západní Slovensko)
- **Banská Bystrica** (střední Slovensko)
- **Trnava** (západní Slovensko)
- **Žilina** (sever Slovenska)

Pro každé: najdi v `location-data-packet.md` řádek a zkopíruj data.

---

## Jak to dělat v praxi

1. **Vezmi master prompt** z `memory/location-mdx-prompt.md`
2. **Otevři `memory/location-data-packet-44rap.md`** — tam najdeš **hotové texty** z 44rap API pro 35 měst a 103 rapperů
3. **Vyhledej své město** v packetu (Ctrl+F na název)
4. **Zkopíruj SAMPLE textů** z 44rap (Hugo Toxxx: Intro, Žánry, Témata, Unikátní, Vliv, atd.)
5. **Vlož do GPT** v tomto pořadí:
   - Master prompt
   - Prázdný řádek
   - 44rap data pro dané město (zkopírované z packetu)
   - Příkaz: "Vygeneruj MDX pro toto město podle master promptu. Tier 1."
6. **Zkontroluj výstup** — hlavně že:
   - Všechna jména jsou v datech
   - Žádné generické fráze
   - Má blockquote s třemi poli
   - Má H1 + perex + hlavní text + seznam
7. **Ulož** do `content/entities/location_<slug>/entity.mdx` (přepiš celý soubor)

## Dva packet varianty

- **`memory/location-data-packet.md`** — stručný, z RKG cache (rapeři, alba, labely, žánry). 382 řádků.
- **`memory/location-data-packet-44rap.md`** — **bohatý**, z 44rap API (short_intro, themes, what_makes_unique, career_summary, key_albums.description, sources, …). 182 kB. **Doporučený primární zdroj.**

44rap má méně celkových měst (35 vs 49), ale **mnohem detailnější data per artist** (top 50 rapperů z 44rap mají všechna klíčová pole vyplněná). RKG cache má zase všechny 49 měst, ale chudší data per artist.

**Doporučení:** Pokud město je v 44rap packetu, použij ten. Pokud ne, fallbackuj na RKG packet.

---

## Tip

- Když GPT generuje moc marketingově, přidej: "Píšeš pro lidi ze scény, ne pro turisty. Buď konkrétní a vrstevnatý, ne popisný."
- Když je text moc krátký, přidej: "Přidej odstavec 'Klíčové momenty / éra po éře' s 2-3 konkrétními milníky."
- Když je moc dlouhý (>4 kB), přidej: "Zkrať na 1.5-2 kB. Vyhoď vše co není klíčové pro identitu města."
