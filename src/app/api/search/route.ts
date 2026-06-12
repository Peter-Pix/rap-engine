import { NextResponse } from "next/server";
import { readSearchIndex } from "@/lib/content/cache-reader";

export async function GET() {
  const entries = readSearchIndex();
  return NextResponse.json({ entries: entries || [] });
}
