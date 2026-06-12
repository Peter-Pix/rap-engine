import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Články", "Články a analýzy o české a slovenské rapové scéně.");

export default createListingPage({ type: "article", title: "Články" });
