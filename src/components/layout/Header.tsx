"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";

const NAV = [
  { label: "Rappeři", href: "/raperi" },
  { label: "Alba", href: "/alba" },
  { label: "Skladby", href: "/skladby" },
  { label: "Labely", href: "/labely" },
  { label: "Žánry", href: "/zanry" },
  { label: "Mapa", href: "/mapa" },
  { label: "Celá síť", href: "/sceny" },
];

// ─── Icons ──────────────────────────────────────────────────────────────

function IconMenu({ open }: { open: boolean }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconSearch({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
      />
    </svg>
  );
}

function IconClose({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ─── Fullscreen mobile search overlay ──────────────────────────────────

function MobileSearchOverlay({ onClose }: { onClose: () => void }) {
  // Lock body scroll while overlay is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-zinc-950/98 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.08] shrink-0">
        <span className="text-xs font-mono uppercase tracking-widest text-white/40">
          Hledat
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Zavřít vyhledávání"
        >
          <IconClose />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {/* SearchBar handles its own width; on mobile we let it stretch */}
        <div className="[&_input]:text-base [&_input]:py-3 [&_input]:pl-12 [&_input]:pr-12 [&_svg]:w-5 [&_svg]:h-5">
          <SearchBar onResultClick={onClose} />
        </div>
        <div className="mt-6 px-1 text-xs text-white/40 leading-relaxed">
          <p className="mb-3 font-mono uppercase tracking-widest text-white/50">
            Rychlé odkazy
          </p>
          <ul className="space-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block py-2 text-zinc-300 hover:text-white transition-colors"
                >
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

// ─── Main Header ────────────────────────────────────────────────────────

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (!isMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isMenuOpen]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
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
          <Link
            href="/"
            className="flex items-center gap-2 group shrink-0"
            aria-label="4rap.cz — domů"
          >
            <span className="font-sans text-2xl font-black italic tracking-tight leading-none text-white">
              4RAP<span className="text-[#c8962e]">.</span>
            </span>
            <span className="hidden lg:inline-block text-[10px] font-mono uppercase tracking-widest text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
              Beta
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2.5 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-all duration-150"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop search */}
          <div className="hidden md:block ml-auto">
            <div className="w-64 lg:w-80">
              <SearchBar />
            </div>
          </div>

          {/* Mobile actions: search button + hamburger */}
          <div className="flex items-center gap-1 ml-auto md:hidden">
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
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Zavřít menu"
            onClick={closeMenu}
            className="fixed inset-0 top-14 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          />
          {/* Drawer */}
          <nav
            className="absolute left-0 right-0 top-full z-40 md:hidden border-t border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/40"
            aria-label="Hlavní menu"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="px-3 py-3 text-base font-medium text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-all duration-150"
                >
                  {item.label}
                </Link>
              ))}
              <div className="h-px bg-white/[0.06] my-2" />
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

      {/* Mobile search overlay */}
      {isSearchOpen && <MobileSearchOverlay onClose={closeSearch} />}
    </header>
  );
}