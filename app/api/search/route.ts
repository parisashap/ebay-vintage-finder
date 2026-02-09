import { NextRequest, NextResponse } from "next/server";
import { searchEbay } from "@/lib/ebay";

export const runtime = "nodejs";

function parseBoolean(value: string | null, defaultValue: boolean) {
  if (value === null) return defaultValue;
  return value.toLowerCase() === "true";
}

function parseTerms(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const keyword = searchParams.get("keyword") ?? "";
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const condition = searchParams.get("condition") as
      | "new"
      | "used"
      | "refurbished"
      | "for_parts"
      | null;
    const requireUsed = searchParams.get("requireUsed");
    const requireBrand = searchParams.get("requireBrand");
    const includeTerms = searchParams.get("includeTerms");
    const excludeTerms = searchParams.get("excludeTerms");
    const sortBy = searchParams.get("sortBy") as
      | "best_match"
      | "price_low"
      | "price_high"
      | "confidence_low"
      | null;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const data = await searchEbay({
      keyword,
      categoryId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      condition: condition ?? undefined,
      requireUsed: parseBoolean(requireUsed, true),
      requireBrand: parseBoolean(requireBrand, true),
      includeTerms: parseTerms(includeTerms),
      excludeTerms: parseTerms(excludeTerms),
      sortBy: sortBy ?? "best_match",
      limit: limit ? Number(limit) : 24,
      offset: offset ? Number(offset) : 0,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
