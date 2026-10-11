import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Žánry", "Rapové žánry a styly — od boom bapu po trap.");

export const revalidate = 3600;

export default createListingPage({ type: "genre", title: "Žánry" });
