import type { Metadata } from "next";
import { AskClient } from "./AskClient";

export const metadata: Metadata = {
  title: "Zeptej se databáze",
  description:
    "Zeptej se naší databáze českého a slovenského rapu — rappery, skladby, alba, spolupráce. AI odpovídá jen z ověřených dat, bez halucinací.",
  robots: { index: true, follow: true },
};

export default function AskPage() {
  return <AskClient />;
}
