"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_ID || !pathname || typeof window === "undefined") return;

    window.gtag("config", GA_ID, {
      page_path: pathname,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [pathname]);

  return null;
}
