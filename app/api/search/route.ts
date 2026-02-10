import { NextRequest, NextResponse } from "next/server";
import { searchEbay } from "@/lib/ebay";

export const runtime = "nodejs";

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
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const data = await searchEbay({
      keyword,
      categoryId,
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
