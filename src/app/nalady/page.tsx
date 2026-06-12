import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Nálady", "Emoční nálady rapové hudby — dark, emotional, raw, club a další.");

export default createListingPage({ type: "mood", title: "Nálady" });
