# Dnešní rozvrh (20. 6. 2026)

> Log kroků pro dnešní session. **Všechny změny** jsou commitnutý do gitu, working tree čistej, **záloha v `.backups/20260620_0204/`** (7.2 MB) pro případný rollback.

---

## 📋 Plán (doporučený)

| Čas | Úkol | Effort | Status |
|-----|------|--------|--------|
| 09:00-09:30 | **Bug fixes P0** (Hasan, Tafrob, redzed, strapo) | 30 min | ⏳ TODO |
| 09:30-11:30 | **Schema.org markup** (MusicGroup, MusicAlbum) | 2 hod | ⏳ TODO |
| 11:30-12:00 | **Sitemap.xml** (s tier-based priority) | 30 min | ⏳ TODO |
| 12:00-13:00 | OBĚD | — | — |
| 13:00-14:00 | **Top 21-30 shortTag** (texty připravíš) | 1 hod | ⏳ TODO |
| 14:00-15:00 | **Top 31-50 shortTag** | 1 hod | ⏳ TODO |
| 15:00-16:00 | **Fix `style→genre` errors** (323 validačních) | 1 hod | ⏳ TODO |
| 16:00-17:00 | **Buffer / kontingence** | 1 hod | — |

---

## ✅ Status aktuálního kroku

### Krok 0: Záloha + setup (02:04)
**Hotovo.**
- Záloha: `.backups/20260620_0204/` (7.2 MB)
  - `.content-cache/` (1349 entit, 5684 edges)
  - 10 TS/TSX souborů (images.ts, page.tsx, Header/Footer.tsx, layout.tsx, mdx.tsx, page-helpers.tsx, schemas.ts, EntityListingClient/TypeListing.tsx)
  - 23 skripty ze `scripts/`
  - `public/` (39 webp + 3 ikony)
- Rollback skript: `.backups/20260620_0204/rollback.sh` (executable)
  - **Použití**: `bash .backups/20260620_0204/rollback.sh` — obnoví vše ze zálohy
  - **Co udělá**:
    1. Zálohuje aktuální stav do `.backups/before-rollback-<timestamp>/`
    2. Obnoví 11 souborů + `.content-cache/` + `public/`
- Working tree: clean (kromě `raw-data/4R-logo.png`, `scripts/import-artist-image.ts`, `memory/` — to jsou ne-commitnuté nové soubory)
- Poslední commit: `33ee389 perf(images): snížit kvalitu nik-tendo (q82→q75) + rytmus (q82→q78)`

**Vše je vratné** přes git reset (počet commitů od zálohy = 0, takže `git reset --hard HEAD` je no-op).

---

## 📝 Log kroků

### Krok 0: Záloha (02:04) ✅
- Vytvořena kompletní záloha `.backups/20260620_0204/`
- Vygenerován rollback skript
- Working tree ověřen jako čistej

### Krok 1: Bug fixes P0 (TODO - 09:00)
**Plán:**
1. Hasan — stáhnout reálnou URL z `artist_hasan.profile.profileImageUrl`
2. Tafrob — stejný postup
3. `redzed.webp` + `strapo.webp` — buď přejmenovat na `.svg`, nebo vymazat mapování v `images.ts`

**Skripty potřeba**: `scripts/batch-import-images.ts` (už existuje)

### Krok 2: Schema.org markup (TODO - 09:30)
**Plán:**
- Přidat JSON-LD do `layout.tsx` (root schema)
- Pro artist page: `MusicGroup` s name, description, image, sameAs
- Pro album page: `MusicAlbum` s byArtist, datePublished
- Validovat přes Schema.org Structured Data Testing Tool

**Skripty potřeba**: helper funkce v `page-helpers.tsx`

### Krok 3: Sitemap.xml (TODO - 11:30)
**Plán:**
- Skript co projde `.content-cache/routes.json`
- Tier 1 (top 50 artistů): priority 0.9, changefreq daily
- Tier 2: priority 0.7, weekly
- Tier 3 (draft): excluded
- Generuje `app/sitemap.ts` (Next.js convention)

### Krok 4: Top 21-30 shortTag (TODO - 13:00)
**Plán:**
- Použít existující `scripts/add-short-tags.ts`
- Přidat rank 21-30 (G1nter, James Cole, Jay Diesel, Jickson, NobodyListen, Protiva, Koky, Lipo, Sharlota, SHIMMI)
- Vyžaduje texty od tebe

### Krok 5: Top 31-50 shortTag (TODO - 14:00)
**Plán:**
- Pokračování s rank 31-50

### Krok 6: Fix `style→genre` errors (TODO - 15:00)
**Plán:**
- Diagnostika: projít outbound relations všech entit
- Kde `key === "style"` a target je `genre_*` → přesunout do `HAS_GENRE`
- Rebuild cache + ověření bez `SKIP_VALIDATION=1`

---

## 🔄 Jak vrátit změny (kdyby něco)

### Varianta A: Jednotlivý commit
```bash
git revert HEAD         # revert poslední commit
git revert HEAD~2       # revert 2. od konce
```

### Varianta B: Kompletní rollback
```bash
bash .backups/20260620_0204/rollback.sh
```

### Varianta C: Reset na konkrétní commit
```bash
git reset --hard <commit-sha>
```

### Poznámka
- **NEPOUŽÍVAT `git reset --hard`** bez přemýšlení — ztratíš working tree
- **Preferuj `git revert`** — bezpečnější (vytvoří nový commit, stará historie zůstane)

---

## 📊 Co se očekává

Po dnešním plánu:
- **0 placeholderů** u top 30 rapperů
- **Schema.org markup** u všech Tier 1 entit → rich snippets
- **Sitemap.xml** pro lepší crawl
- **Top 50 shortTag** kompletní
- **Build projde čistě** bez `SKIP_VALIDATION=1`

**Business impact**:
- CTR boost (rich snippets): +10-30%
- Google crawl coverage: lepší
- User experience: originální tagy místo AI generik

---

## 🎯 Poznámky

- Každý krok by měl být **1 commit** (atomicita)
- Po každém kroku **ověř v browseru** (hard refresh)
- Pokud něco rozbije, **rollback skript** je první co spustíš
- Paměť denně updatuj (tento soubor je jeden z nich)