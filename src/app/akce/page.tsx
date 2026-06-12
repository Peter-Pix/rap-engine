import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Akce", "Hip-hopové akce, koncerty a festivaly v Česku a na Slovensku.");

export default createListingPage({ type: "event", title: "Akce" });
