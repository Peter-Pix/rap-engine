# Nula halucinací — jak je to vynucené

**Cíl:** AI vrstva nad KG, která NIKDY nevymyslí fakt. Ne "snažíme se", ale vynuceno v kódu.

## 6 vrstev obrany

```
dotaz
  │
  ├─ [1] ENTITY RESOLVER (entity-resolver.ts)
  │      Najdi, na které entity se dotaz ptá (exact → bigram → partial).
  │      Zdroj "negativního důkazu": víme, co uživatel zmínil.
  │
  ├─ [2] GATE (ask.ts: gate)
  │      Rozhodni, zda odpovídat. Whitelist entit z dotazu.
  │
  ├─ [3] GROUNDING (grounding.ts)
  │      Postav kontext JEN z whitelistovaných entit + jejich hran.
  │      LLM nemá odkud vymyslet nic jiného.
  │      computeFacts(): počty a kolaborace spočítané V KÓDU, ne LLM.
  │
  ├─ [4] LLM (DeepSeek 4.1 Flash, reasoning_effort=none)
  │      Grounded prompt: "odpovídej POUZE z kontextu, cituj URL".
  │
  ├─ [5] VALIDACE (validate.ts)
  │      Každá URL → musí být ve whitelistu.
  │      Každé boldované vlastní jméno → musí existovat v KG.
  │      Při violation → 1 retry s nápravou.
  │
  └─ [6] FALLBACK
         Pokud ani retry není validní → NIKDY netvrdit "nemáme"
         (to by byla lež). Místo toho: "odpověď se nepodařilo ověřit".
```

## Proč to funguje

| Typ halucinace | Která vrstva chytá |
|---|---|
| Vymyšlená kolaborace | 3 (data nejsou v kontextu) + 5 (jméno není ve whitelistu) |
| Vymyšlené album/track | 5 (validace jména) |
| Vymyšlená URL | 5 (validace URL) |
| Vymyšlené číslo ("89 skladeb") | 3 (computeFacts spočítá v kódu) |
| Odpověď na neexistující entitu (Iso Alp) | 1+2 (resolver najde, že neexistuje) |

## Klíčové invarianty

1. **LLM nikdy nevidí data mimo whitelist.** Kontext se staví z ověřených entit.
2. **Čísla se nepočítají v LLM.** `computeFacts()` je spočítá v JS z grafu.
3. **Validace je vynucená, ne promptová.** I kdyby LLM pravidla ignoroval, kód odpověď zablokuje.
4. **Fallback nesmí lhát.** Neověřená odpověď → poctivé "nelze ověřit", ne "nemáme".

## Náklady a výkon (měřeno)

- Latence: **0,6–2,3 s** (Ø ~1,0 s)
- Tokeny: ~2,5–4,7 K/dotaz
- `reasoning_effort: "none"` = 44 vs 117 tokenů (−62 %)
- Retry: ~0 % (po opravě validace vše na 1. pokus)

## Testy (11/11)

`src/lib/ai/validate.test.ts` — včetně regresních testů na falešné positive,
které spike odhalil (čísla v bold, běžná slova).

## Chyby odhalené spikem (a opravené)

1. **Falešný positive:** validace hlásila "89 vlastních skladeb" jako entitu → fallback "nemáme" → **dezinformace**.
   Fix: bold s číslem / převážně běžnými slovy není entita.
2. **Lživý fallback:** neověřená odpověď se zobrazila jako "nemáme". Fix: poctivé "nelze ověřit".
3. **Slabý retrieval:** "s kým spolupracoval X" selhávalo → 3/5. Fix: exact-title boost + bigramy + stop-slova → 5/5.
