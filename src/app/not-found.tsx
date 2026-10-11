import type { Metadata } from "next";
import { NotFoundClient } from "@/components/misc/NotFoundClient";

// 404 musí být explicitně noindex — jinak root layout přidá "index, follow"
// a na stránce skončí DVĚ konfliktní <meta name="robots">.
export const metadata: Metadata = {
  title: "404 — Nenalezeno",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundClient />;
}
