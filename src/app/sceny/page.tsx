import type { Metadata } from "next";
import ScenyContent from "./ScenyContent";

export const metadata: Metadata = {
  title: "Celá síť — 4rap.cz",
  description: "Interaktivní mapa všech vazeb v české a slovenské rapové scéně. Prozkoumej propojení mezi interprety, alby, labely a městy.",
};

export default function ScenyPage() {
  return <ScenyContent />;
}
