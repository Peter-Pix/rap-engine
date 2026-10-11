import type { Metadata } from "next";
import { NotFoundClient } from "@/components/misc/NotFoundClient";

export const metadata: Metadata = {
  title: "404 — Nenalezeno",
  // Next.js default for not-found pages is noindex,nofollow.
  // Explicit robots here duplicates the default tag, so we omit it.
};

export default function NotFound() {
  return <NotFoundClient />;
}
