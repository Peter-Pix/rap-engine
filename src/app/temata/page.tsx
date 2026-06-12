import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Témata", "Témata rapových textů — street-life, relationships, success, society a další.");

export default createListingPage({ type: "theme", title: "Témata" });
