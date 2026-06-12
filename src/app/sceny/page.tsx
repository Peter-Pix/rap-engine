import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Scény", "Rapové scény — underground, mainstream, independent a další.");

export default createListingPage({ type: "scene", title: "Scény" });
