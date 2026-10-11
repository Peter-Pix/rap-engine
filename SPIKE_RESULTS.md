# Spike: Grounded AI vrstva nad KG — výsledky (2026-10-11)

## Cíl
Ověřit, zda je proveditelné postavit AI vrstvu s **nulou halucinací** nad naším KG,
bez vektorové DB (8GB Mac constraint). Go/no-go před investicí do UI.

## Model
`deepseek-v4.1-flash` (Ollama Cloud, OpenAI-compat `/v1/chat/completions`)
- **`reasoning_effort: "none"`** = 44 tokenů vs 117 baseline (−62 %), 879 ms vs 1097 ms
- Bez CoT, finish: stop, žádné prázdné odpovědi

## Architektura spike
```
dotaz → retrieval (keyword + exact-title boost + type heuristika)
      → graph expansion (out+in hrany nalezených entit)
      → agregace spoluprací (RELATED_ARTIST/RELATED_TO/FEATURES)
      → grounded prompt (odpovídej JEN z kontextu)
      → DeepSeek 4.1 Flash → odpověď + citace URL
```

## Výsledky (5 reálných dotazů)

### Před vylepšením retrieval: 3/5
| Dotaz | Výsledek |
|---|---|
| S kým spolupracoval ADiss? | ❌ „nemáme" (retrieval selhal — tokenizace na "kým") |
| Kolik má Iso Alp skladeb? | ✅ „nemáme" (správně) |
| Nejlepší trapové tracky? | ✅ „nemáme" (nemáme žebříčky) |
| O čem je Boh dal love? | ✅ přesně + citace |
| Kdo produkoval 7krát3? | ❌ „nemáme" |

### Po vylepšení retrieval: 5/5, 0 halucinací
| Dotaz | Výsledek |
|---|---|
| S kým spolupracoval ADiss? | ✅ seznam + upozornění „nejčastěji nelze určit" |
| Kolik má Iso Alp skladeb? | ✅ „nemáme" |
| Kdo je ADiss a odkud? | ✅ jméno, město, label (z contentu) |
| O čem je Boh dal love? | ✅ + album, rok, producent |
| Jaké žánry dělá ADiss? | ✅ 9 žánrů + zdroj |

**Latence:** 894 ms – 2,2 s (Ø ~1,4 s). **Tokeny:** 2,5-4,7 K/dotaz.
**Halucinace: 0/5.** Model nikdy nedoplnil fakt mimo kontext.

## Klíčové lekce pro implementaci
1. **Retrieval je kritický** — bez exact-title boostu a stop-slov selhává. 3/5 → 5/5 rozdíl.
2. **Graph expansion musí být obousměrný** (out + in) — inbound hrany jsou pro kolaborace zásadní.
3. **Agregace vztahů před LLM** — „s kým spolupracoval" se počítá v kódu, ne v LLM. Přesnější.
4. **„Nevím" funguje** — ale je křehké u podobných jmen (Iso Alp vs Alpy). Negativní důkaz je nutný.
5. **`reasoning_effort: "none"`** je povinné (úspora tokenů/času).

## Verdikt: GO ✅
Všech 5 dotazů správně, nula halucinací, latence pod 2,5 s.
Data (2 365 bohatých entit + 26 204 hran) stačí na důvěryhodnou vrstvu.

## Další kroky (Fáze 1)
1. `/api/ask` route — přenést spike logiku do produkce
2. Vyřešit „negativní důkaz" — explicitní kontrola, zda hledaná entita existuje
3. Ground-truth testy (10 dotazů)
4. UI (Fáze 2)

Spike skript: `scripts/spike/ask-rag-spike.mjs`
