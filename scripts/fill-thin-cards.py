#!/usr/bin/env python3
"""
Doplní ověřený úvodní text do karet, které po AI strip zůstaly tenké.

Zdroj: kurátorované wiki extrakty (ručně ověřené, žádné falešné shody).
Nepřepisuje existující obsah — jen přidá odstavec pod úvod, pokud je karta tenká.

Použití: python3 scripts/fill-thin-cards.py [--write]
"""
import re, sys
from pathlib import Path
ENT = Path(__file__).resolve().parent.parent / "content" / "entities"
WRITE = "--write" in sys.argv

# Kurátorované texty (fakta z CS/SK Wikipedie, ověřeno ručně)
FILL = {
"smack": """Jakub Janeček, známější jako **Smack One** nebo jen **Smack** (* 7. června 1986 Praha), je český MC, rapper, DJ a producent. Díky spolupráci se skupinou **Iscream Boyz** se proslavil jako první grime rapper v Česku. Je zakladatelem vydavatelství **Archetyp 51** a trojnásobným držitelem Ceny Anděl v kategorii Rap. [cs.wikipedia.org](https://cs.wikipedia.org/wiki/Smack_One)""",

"dj-opia": """Roman Ševčík (* 1979 Brno), vystupující jako **DJ Opia**, je český producent, DJ a videomaker. Proslavil se působením v rapové kapele **Naše Věc** a v uskupení DJů **Illuzionists**, později i sólově. Jeho dráha odstartovala druhou deskou Naše Věc **Blázni jsou ti** (2001), kde produkoval několik skladeb. [cs.wikipedia.org](https://cs.wikipedia.org/wiki/DJ_Opia)""",

"strapo": """Ján Strapec (* 10. března 1989 Trnava), známý jako **Strapo**, je slovenský rapper a freestyler. Je dvojnásobným vítězem celoslovenské soutěže **Artattack Freestyle Battle** (poprvé 2006). V roce 2007 vydal EP **MC, který věděl příliš**, o rok později mixtape **50:50** s DJ Spinhandzem a v roce 2012 album **23** s producentem Emeresem. [sk.wikipedia.org](https://sk.wikipedia.org/wiki/Strapo)""",

"sergei-barracuda": """**Sergei Barracuda** (vlastním jménem Erik Peter) je český rapper z Ostravy. Kariéru začal v ostravském seskupení **Fuerza Arma**, odkud kvůli neshodě s Yzomandiasem odešel, a připojil se k labelu **Azurit Kingdom**. S Pastorem a DJ Bussym tvořili skupinu **AK** — vydali *AK Mixtape* (2014), *Bída & Bolest* (2015) a poslední *Syndikát* (2019). V březnu 2020 se AK kvůli neshodám rozpadlo. [cs.wikipedia.org](https://cs.wikipedia.org/wiki/Sergei_Barracuda)""",

"sharlota": """**Sharlota** (* 17. září 1996 Praha, rodným jménem Šarlota Frantinová) je česká rapperka, zpěvačka a členka vydavatelství **Blakkwood Records**. Kariéru začala v roce 2012 singlem „Do rána" s uskupením Abde & Sharlota x Deno. V roce 2014 ji oslovilo Blakkwood Records, o rok později vydala první sólový projekt **Vdova EP**. [cs.wikipedia.org](https://cs.wikipedia.org/wiki/Sharlota)""",

"protiva": """**Protiva** (4. září 1997 Praha – 7. října 2024 Praha), celým jménem Pavel Protiva, byl český rapper, skladatel a producent. Vystupoval také pod pseudonymy Stanislav Protiva, Standa, Paya nebo Zel Dox. Hudbě se věnoval od svých 12 let, kdy se přestěhoval do Prahy za otcem. [cs.wikipedia.org](https://cs.wikipedia.org/wiki/Protiva_(rapper))""",

"michajlov": """**Michajlov**, vlastním jménem Michal Michajlov (* 1. září 1991 Kerecky, Ukrajina), je český rapper ukrajinského původu a výrazná postava brněnského hip hopu. Ve 12 letech se přestěhoval za matkou do Brna. Vyučil se automechanikem a před rapem pracoval v autoservisu. Působí pod labelem **1312 Records**. [cs.wikipedia.org](https://cs.wikipedia.org/wiki/Michajlov_(rapper))""",

"jay-diesel": """Jiří Rejfíř (* 15. května 1978 Rychnov nad Kněžnou), známý jako **Jay Diesel**, je český rapper a zpěvák. Je členem **Blakkwood Records** a zakladatelem jedné z prvních hiphopových kapel na východě Čech, **D.Real.C**. Rapu se začal věnovat kolem roku 1999, první skladby vyšly na kompilaci *Lyrik Derby* (2001). [cs.wikipedia.org](https://cs.wikipedia.org/wiki/Jay_Diesel)""",

"viktor-sheen": """**Viktor Sheen**, vlastním jménem Viktor Dundych (* 15. srpna 1993, Almaty, Kazachstán), je český zpěvák a rapper kazašského původu. Ve třech letech se s rodinou přestěhoval do Česka a vyrůstal na Kladně. Na začátku kariéry byl členem skupin **Crap Crew** a **Da Staffers** (DSTFRS) a labelu Blakkwood. Debutovým sólovým projektem byl mixtape **Pod povrchem** (2010). V roce 2015 vydal s Rennem Dangem **Projekt Asia**, roku 2017 debutové album **Jungler** a v roce 2019 desku **Černobílej svět**, která se stala nejprodávanější původní českou deskou roku. [cs.wikipedia.org](https://cs.wikipedia.org/wiki/Viktor_Sheen)""",

"boy-wonder": """**Boy Wonder**, vlastním jménem Lukáš Jedlička (* Trnava, Slovensko), je slovenský rapper a člen labelu **Ty Nikdy**. V minulosti byl součástí skupiny **Turbo Boost** společně s Torulem, Turbem T, Billym Hollywoodem a DJ Spankem. [cs.wikipedia.org](https://cs.wikipedia.org/wiki/Boy_Wonder)""",
}

def body_len(t):
    return len(re.sub(r"^---.*?---","",t,flags=re.S).strip())

changed=[]
for key,add in FILL.items():
    d=ENT/f"artist_{key}"
    f=d/"entity.mdx"
    if not f.exists(): print("chybí:",key); continue
    t=f.read_text()
    if body_len(t)>1450: print(f"  SKIP {key} (už dost dlouhé)"); continue
    # přidej odstavec za úvod (za první odstavec, pokud frontmatter)
    m=re.match(r"^(---\n.*?\n---\n)", t, re.S)
    fm=m.group(1) if m else ""
    rest=t[len(fm):]
    new=fm+add+"\n\n"+rest.lstrip("\n")
    changed.append((key,body_len(t),body_len(new)))
    if WRITE: f.write_text(new)

print(f"\n{'ZAPSÁNO' if WRITE else 'DRY-RUN'}: {len(changed)}")
for k,a,b in changed: print(f"  {k:22} {a} → {b}")
