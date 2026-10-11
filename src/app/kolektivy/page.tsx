import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Kolektivy", "Rapové kolektivy a crew — PSH, Milion+, Supercrooo a další.");

export const revalidate = 3600;

export default createListingPage({ type: "collective", title: "Kolektivy" });
