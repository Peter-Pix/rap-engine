import type { Metadata } from "next";
import { NotFoundClient } from "@/components/misc/NotFoundClient";

export const metadata: Metadata = {
  title: "404 — Nenalezeno",
  // Root layout injects `index, follow` by default. We force override here.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundClient />;
}
