import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Producenti", "Čeští a slovenští hip-hopoví producenti.");

export const revalidate = 3600;

export default createListingPage({ type: "producer", title: "Producenti" });
