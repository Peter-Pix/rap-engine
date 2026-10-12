"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * EntityJumpNav — sticky chip-bar pro rychlou orientaci na dlouhém detailu entity.
 *
 * Proč: detail entity (rapper/album) má 10+ sekcí v jednom sloupci na mobilu.
 * Klíčové info je utopené několik obrazovek hluboko. Tento bar přidá zkratky
 * pro skok na sekci, které na stránce REÁLNĚ existují.
 *
 * Jak funguje:
 *   1. Po mountu naskenuje elementy s `[data-jump-section]` atributem.
 *   2. Z jejich `data-jump-label` vyrenderuje chipy (horizontálně scrollovatelné).
 *   3. Klepnutí = smooth scroll s offsetem na sticky header.
 *   4. IntersectionObserver zvýrazní aktivní sekci.
 *
 * Nic nemění v rozložení stránky — jen přidá orientační vrstvu.
 * Sekce se přidávají deklarativně: <section data-jump-section data-jump-label="Alba">.
 */

const HEADER_OFFSET = 96; // výška sticky headeru + odstup

export function EntityJumpNav() {
  const [sections, setSections] = useState<{ id: string; label: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // ── Sken sekcí po mountu ──────────────────────────────────────────────
  // DOM je externí systém — sken běží až po layoutu (rAF), ne synchronně
  // v těle effectu (viz react-hooks/set-state-in-effect).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-jump-section]")
      ).filter((el) => el.dataset.jumpLabel);

      const found = els.map((el, i) => {
        const id = `jump-sec-${i}`;
        el.id = id;
        return { id, label: el.dataset.jumpLabel as string };
      });
      setSections(found);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Aktivní sekce přes IntersectionObserver ──────────────────────────
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-jump-section]")
    );
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: `-${HEADER_OFFSET + 24}px 0px -55% 0px`, threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // ── Scroll na sekci ────────────────────────────────────────────────────
  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }, []);

  // ── Aktivní chip posuň do view (jen HORIZONTÁLNÍ scroller) ──────────────
  // POZOR: `chip.scrollIntoView({ block: "nearest" })` na iOS Safari posune
  // i VERTIKÁLNÍ scroll celé stránky → při scrollování dolů stránka "vyjede"
  // nahoru. Proto scrolujeme pouze horizontálně přes `scrollLeft`, což
  // vertikální scroll nemůže ovlivnit.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!activeId || !scroller) return;
    const chip = scroller.querySelector<HTMLElement>(`[data-chip="${activeId}"]`);
    if (!chip) return;
    const target =
      chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
  }, [activeId]);

  if (sections.length < 2) return null;

  return (
    <div
      ref={barRef}
      className="sticky top-14 z-30 -mx-4 sm:mx-0 border-b border-white/[0.06] bg-zinc-950/85 backdrop-blur-xl"
    >
      <div
        ref={scrollerRef}
        className="flex items-center gap-1 overflow-x-auto px-4 sm:px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              data-chip={s.id}
              type="button"
              onClick={() => jumpTo(s.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
                active
                  ? "bg-[#c8962e]/15 text-[#c8962e]"
                  : "text-white/50 hover:text-white/90 hover:bg-white/[0.06]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
