import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Styly", "Rapové styly — melodic, aggressive, conscious, experimental a další.");

export const revalidate = 3600;

export default createListingPage({ type: "style", title: "Styly" });
