import { NextRequest, NextResponse } from "next/server";
import { searchEbay } from "@/lib/ebay";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const keyword = searchParams.get("keyword") ?? "";
    const brand = searchParams.get("brand") ?? undefined;
    const gender = (searchParams.get("gender") as "men" | "women" | null) ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const size = searchParams.get("size") ?? undefined;
    const color = searchParams.get("color") ?? undefined;
    const material = searchParams.get("material") ?? undefined;
    const era = (searchParams.get("era") as "70s" | "80s" | "90s" | "y2k" | null) ?? undefined;
    const sortBy =
      (searchParams.get("sortBy") as "best_match" | "price_low" | "price_high" | "newest" | null) ??
      undefined;
    const strictness =
      (searchParams.get("strictness") as "relaxed" | "balanced" | "strict" | null) ?? undefined;
    const excludeTerms =
      searchParams
        .get("excludeTerms")
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const condition = searchParams.get("condition") as
      | "new"
      | "used"
      | null;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const data = await searchEbay({
      keyword,
      brand,
      gender,
      categoryId,
      size,
      color,
      material,
      era,
      sortBy,
      strictness,
      excludeTerms,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      condition: condition ?? undefined,
      limit: limit ? Number(limit) : 24,
      offset: offset ? Number(offset) : 0,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
