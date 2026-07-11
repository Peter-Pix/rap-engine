## Diagnostika grafu — shrnutí k 02:45

### Nález: Hydratční mismatch na `/labely`

V konzoli chyba (NE na `/sceny`, ale na `/labely`):
```
+ href="/labely/die-mannschaft"
- href="/labely/chop-down-records"
```

Server a klient renderují entity v **jiném pořadí** — pravděpodobně kvůli různému `edgeCounts` (server/count vs client/count s `inbound`).

### Proč to rozbíjí i `/sceny`?
Když React najde hydration mismatch na jakékoliv stránce, může přegenerovat celý DOM — což ovlivní i graf.

### Teorie:
Next.js 16.2.9 + Turbopack + React Strict Mode = double-mount efekty, které mění stav mezi server a client renderem.

### Staging vs Local:
- **Staging** (Vercel build): Statický HTML, žádný hydratční mismatch
- **Local dev** (Turbopack): SSR → hydration → Strict Mode double-mount → mismatch

### Návrh na fix:
Vypnout React Strict Mode v dev, nebo opravit sort logiku tak, aby byla deterministická (včetně fallbacku pro shodné edge count).

---
Probereme se ráno.
