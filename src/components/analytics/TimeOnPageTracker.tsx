"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

const INTERVAL_MS = 30000; // 30 sekund
const MAX_TRACKED = 10; // max 5 minut

export function useTimeOnPage() {
  const countRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      countRef.current += 1;
      const seconds = (countRef.current * INTERVAL_MS) / 1000;
      trackEvent("time_on_page", {
        seconds,
        page_path: window.location.pathname,
      });
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);
}
