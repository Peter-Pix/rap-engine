"use client";

import { useScrollDepth } from "./ScrollDepthTracker";
import { useTimeOnPage } from "./TimeOnPageTracker";

export function EngagementTracker() {
  useScrollDepth();
  useTimeOnPage();
  return null;
}
