import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Skladby", "Kompletní seznam skladeb české a slovenské rapové scény.");

export default createListingPage({ type: "track", title: "Skladby" });
