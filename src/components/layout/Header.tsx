"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";
import { AskPanel } from "@/components/ai/AskPanel";

/**
 * Struktura menu — jeden zdroj pravdy pro desktop i mobil.
 *
 * Filozofie: 5 hlavních vstupů v liště + jedna "Objevuj" mega-menu se
 * vším ostatním. Dřív byl desktop ochuzený (8 plochých odkazů) a mobil
 * přeplácaný (16 odkazů bez souvislosti) — teď obojí čte stejnou strukturu.
 */
const PRIMARY = [
  { label: "Rappeři", href: "/raperi" },
  { label: "Alba", href: "/alba" },
  { label: "Skladby", href: "/skladby" },
] as const;

interface NavItem {
  label: string;
  href: string;
  desc?: string;
  /** Zvýrazněná položka (nová / klíčová funkce) */
  featured?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Sekce "Objevuj" — mega-menu na desktopu, skupiny v mobilním draweru. */
const DISCOVER_GROUPS: NavGroup[] = [
  {
    title: "Propojení",
    items: [
      {
        label: "Cesta mezi rappery",
        href: "/cesta",
        desc: "Nejkratší propojení dvou interpretů",
        featured: true,
      },
      { label: "Celá síť", href: "/sceny", desc: "Interaktivní graf všech vazeb" },
      { label: "Porovnat rappery", href: "/porovnat", desc: "Dva profily vedle sebe" },
      { label: "Mapa", href: "/mapa", desc: "Města a regiony scény" },
    ],
  },
  {
    title: "Lidé a scéna",
    items: [
      { label: "Producenti", href: "/producenti" },
      { label: "Kolektivy", href: "/kolektivy" },
      { label: "Labely", href: "/labely" },
      { label: "Lokality", href: "/lokality" },
    ],
  },
  {
    title: "Kontext",
    items: [
      { label: "Žánry", href: "/zanry" },
      { label: "Styly", href: "/styly" },
      { label: "Nálady", href: "/nalady" },
      { label: "Témata", href: "/temata" },
      { label: "Akce", href: "/akce" },
      { label: "Články", href: "/clanky" },
    ],
  },
];

/** Zploštěný seznam pro mobilní drawer (rychlé odkazy + sekce). */
const ALL_ITEMS: NavItem[] = [
  ...PRIMARY.map((p) => ({ label: p.label, href: p.href })),
  ...DISCOVER_GROUPS.flatMap((g) => g.items),
];

// ─── Icons ──────────────────────────────────────────────────────────────

function IconMenu({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconSearch({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}

function IconClose({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconSpark({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  );
}

// ─── Fullscreen mobile search overlay ──────────────────────────────────

function MobileSearchOverlay({ onClose }: { onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const input = rootRef.current?.querySelector("input");
    if (!input) return;
    input.focus({ preventScroll: true });
    const raf = requestAnimationFrame(() => {
      input.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] lg:hidden bg-zinc-950/98 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.08] shrink-0">
        <span className="text-xs font-mono uppercase tracking-widest text-white/40">Hledat</span>
        <button type="button" onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors" aria-label="Zavřít vyhledávání">
          <IconClose />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="[&_input]:text-base [&_input]:py-3 [&_input]:pl-12 [&_input]:pr-12 [&_svg]:w-5 [&_svg]:h-5">
          <SearchBar onResultClick={onClose} />
        </div>
        <div className="mt-6 px-1 text-xs text-white/40 leading-relaxed">
          <p className="mb-3 font-mono uppercase tracking-widest text-white/50">Rychlé odkazy</p>
          <ul className="space-y-2">
            {ALL_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={onClose} className="block py-2 text-zinc-300 hover:text-white transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop "Objevuj" mega-menu ────────────────────────────────────────

function DiscoverMenu({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const isActive = DISCOVER_GROUPS.some((g) => g.items.some((i) => pathname === i.href));

  // hover intent — chvilka zpoždění, aby menu neblikalo při pohybu myší
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }, []);
  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // klik mimo
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
          isActive || open
            ? "text-zinc-100 bg-white/[0.06]"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
        }`}
      >
        Objevuj
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[min(680px,calc(100vw-2rem))] rounded-xl border border-white/[0.08] bg-zinc-950/98 backdrop-blur-xl shadow-2xl shadow-black/60 p-5">
          <div className="grid grid-cols-3 gap-x-6 gap-y-2">
            {DISCOVER_GROUPS.map((group) => (
              <div key={group.title} className={group.title === "Propojení" ? "col-span-1" : ""}>
                <h3 className="mb-2.5 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-600">
                  {group.title}
                </h3>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`group rounded-md px-2.5 py-2 -mx-2.5 transition-colors ${
                          active ? "bg-white/[0.06]" : "hover:bg-white/[0.06]"
                        }`}
                      >
                        <span
                          className={`flex items-center gap-1.5 text-sm font-medium ${
                            item.featured
                              ? "text-[var(--re-accent)]"
                              : active
                                ? "text-zinc-100"
                                : "text-zinc-300 group-hover:text-zinc-100"
                          }`}
                        >
                          {item.featured && <IconSpark />}
                          {item.label}
                          {item.featured && (
                            <span
                              className="ml-0.5 text-[11px] font-semibold uppercase tracking-wider leading-none px-1.5 py-[3px] rounded-full border"
                              style={{
                                background: "var(--badge-bg)",
                                borderColor: "var(--badge-border)",
                                color: "var(--badge-text)",
                              }}
                            >
                              Nové
                            </span>
                          )}
                        </span>
                        {item.desc && (
                          <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                            {item.desc}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Header ────────────────────────────────────────────────────────

export function Header() {
  const [isAskOpen, setAskOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setAskOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center gap-3 sm:gap-4 md:gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0" aria-label="4rap.cz — domů">
            <span className="font-sans text-2xl font-black italic tracking-tight leading-none text-white">
              4RAP<span className="text-[#c8962e]">.</span>
            </span>
            <span className="hidden lg:inline-block text-[11px] font-mono uppercase tracking-widest text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
              Beta
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2.5 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-all duration-150"
              >
                {item.label}
              </Link>
            ))}
            <DiscoverMenu onNavigate={() => {}} />
            {/* AI vrstva — odlišená */}
            <Link
              href="/zeptej-se"
              title="Zeptej se databáze — experimentální funkce"
              className="group relative ml-1 flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-all duration-150 text-[var(--re-accent)]/85 hover:text-[var(--re-accent)] hover:bg-[var(--badge-bg)]"
            >
              <IconSpark />
              Zeptej se
              <span
                className="hidden xl:inline-block text-[11px] font-semibold uppercase tracking-wider leading-none px-1.5 py-[3px] rounded-full border"
                style={{
                  background: "var(--badge-bg)",
                  borderColor: "var(--badge-border)",
                  color: "var(--badge-text)",
                }}
              >
                Experiment
              </span>
            </Link>
          </nav>

          {/* Desktop search */}
          <div className="hidden lg:block ml-auto">
            <div className="w-64 lg:w-80">
              <SearchBar />
            </div>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 ml-auto lg:hidden">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Otevřít vyhledávání"
            >
              <IconSearch />
            </button>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label={isMenuOpen ? "Zavřít menu" : "Otevřít menu"}
              aria-expanded={isMenuOpen}
            >
              <IconMenu open={isMenuOpen} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {isMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Zavřít menu"
            onClick={closeMenu}
            className="fixed inset-0 top-14 z-[90] bg-black/40 backdrop-blur-sm lg:hidden"
          />
          <nav
            className="absolute left-0 right-0 top-full z-[95] lg:hidden border-t border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/40"
            aria-label="Hlavní menu"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              {/* Featured CTA — nová funkce nahoře, ať je vidět */}
              <Link
                href="/cesta"
                onClick={closeMenu}
                className="flex items-center gap-2.5 px-3 py-3 mb-4 rounded-lg border transition-colors"
                style={{
                  background: "var(--badge-bg)",
                  borderColor: "var(--badge-border)",
                }}
              >
                <IconSpark className="w-4 h-4 text-[var(--re-accent)] shrink-0" />
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold text-[var(--re-accent)] leading-tight">
                    Cesta mezi rappery
                  </span>
                  <span className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Nejkratší propojení dvou interpretů
                  </span>
                </span>
              </Link>

              {/* Hlavní vstupy */}
              <div className="flex flex-col gap-0.5 mb-4">
                {PRIMARY.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="px-3 py-2.5 text-base font-medium text-zinc-200 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-all duration-150"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="h-px bg-white/[0.06] mb-4" />

              {DISCOVER_GROUPS.map((group) => (
                <div key={group.title} className="mb-5 last:mb-0">
                  <h3 className="px-3 mb-2 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-600">
                    {group.title}
                  </h3>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenu}
                        className="px-3 py-2.5 text-base font-medium text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-all duration-150"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="h-px bg-white/[0.06] my-2" />

              <Link
                href="/zeptej-se"
                onClick={closeMenu}
                className="flex items-center gap-2 px-3 py-3 mb-1 text-sm font-medium text-[var(--re-accent)]/85 hover:text-[var(--re-accent)] transition-colors"
              >
                <IconSpark />
                Zeptej se databáze
              </Link>
              <Link
                href="/"
                onClick={closeMenu}
                className="px-3 py-3 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                Hlavní strana
              </Link>
            </div>
          </nav>
        </>
      )}

      {isSearchOpen && <MobileSearchOverlay onClose={closeSearch} />}

      <AskPanel open={isAskOpen} onClose={() => setAskOpen(false)} />
    </header>
  );
}
