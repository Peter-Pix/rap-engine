import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Lokality", "Města a regiony české a slovenské rapové scény.");

export default createListingPage({ type: "location", title: "Lokality" });
