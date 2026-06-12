import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Alba", "Kompletní diskografie české a slovenské rapové scény.");

export default createListingPage({ type: "album", title: "Alba", description: "Kompletní seznam alb" });
