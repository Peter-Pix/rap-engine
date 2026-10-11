import { Metadata } from "next";
import { createListingPage, createListingMetadata } from "@/components/listing/EntityTypeListing";

export const metadata: Metadata = createListingMetadata("Labely", "České a slovenské rapové label — Ty Nikdy, Milion+, Blakkwood a další.");

export const revalidate = 3600;

export default createListingPage({ type: "label", title: "Labely" });
