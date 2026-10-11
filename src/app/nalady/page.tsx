import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Nálady", "Emoční nálady rapové hudby — dark, emotional, raw, club a další.");

export const revalidate = 3600;

export default createListingPage({ type: "mood", title: "Nálady" });
