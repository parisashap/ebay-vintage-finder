import { Listing, SearchResponse } from "@/types/listing";

type SearchParams = {
  keyword: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: "new" | "used" | "refurbished" | "for_parts";
  requireUsed?: boolean;
  requireBrand?: boolean;
  includeTerms?: string[];
  excludeTerms?: string[];
  sortBy?: "best_match" | "price_low" | "price_high" | "confidence_low";
  limit?: number;
  offset?: number;
  marketplaceId?: string;
};

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

const EBAY_ENV = process.env.EBAY_ENV === "sandbox" ? "sandbox" : "production";
const EBAY_BASE_URL =
  EBAY_ENV === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
const EBAY_OAUTH_URL = `${EBAY_BASE_URL}/identity/v1/oauth2/token`;
const EBAY_BROWSE_URL = `${EBAY_BASE_URL}/buy/browse/v1/item_summary/search`;

const CONDITION_MAP: Record<NonNullable<SearchParams["condition"]>, string> = {
  new: "1000",
  used: "3000",
  refurbished: "2000",
  for_parts: "7000",
};

const VINTAGE_POSITIVE_TERMS = [
  "vintage",
  "made in usa",
  "single stitch",
  "80s",
  "90s",
  "70s",
  "y2k",
  "distressed",
  "faded",
  "thrashed",
];

const VINTAGE_NEGATIVE_TERMS = [
  "repro",
  "reproduction",
  "replica",
  "inspired",
  "style",
  "lookalike",
  "new with tags",
  "nwt",
  "fast fashion",
];

const BANNED_BRAND_VALUES = new Set([
  "unbranded",
  "unknown",
  "n/a",
  "na",
  "none",
  "no brand",
]);

function getAuthHeader() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing eBay credentials. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.");
  }
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });

  const res = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getAuthHeader(),
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`eBay OAuth error: ${res.status} ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return tokenCache.token;
}

function buildFilter(params: SearchParams): string | undefined {
  const filters: string[] = [];

  if (typeof params.minPrice === "number" || typeof params.maxPrice === "number") {
    const min = params.minPrice ?? 0;
    const max = params.maxPrice ?? "";
    filters.push(`price:[${min}..${max}]`);
    filters.push("priceCurrency:USD");
  }

  const requireUsed = params.requireUsed ?? true;
  if (params.condition) {
    filters.push(`conditionIds:{${CONDITION_MAP[params.condition]}}`);
  } else if (requireUsed) {
    filters.push(`conditionIds:{${CONDITION_MAP.used}}`);
  }

  return filters.length ? filters.join(",") : undefined;
}

function readBrandFromItemSpecifics(item: any): string | undefined {
  const aspects = Array.isArray(item.localizedAspects) ? item.localizedAspects : [];
  for (const aspect of aspects) {
    if (typeof aspect?.name === "string" && aspect.name.toLowerCase() === "brand") {
      const values = Array.isArray(aspect.value) ? aspect.value : [];
      const first = values.find((value: unknown) => typeof value === "string" && value.trim());
      if (first) return first.trim();
    }
  }

  return undefined;
}

function isAllowedBrand(brand: string | undefined): boolean {
  if (!brand) return false;
  const normalized = brand.trim().toLowerCase().replace(/\./g, "");
  return !BANNED_BRAND_VALUES.has(normalized);
}

function isUsedCondition(condition: string): boolean {
  const c = condition.toLowerCase();
  return c.includes("used") || c.includes("pre-owned") || c.includes("pre owned");
}

function rankVintageConfidence(item: { title: string; brand?: string; condition: string }, keyword: string) {
  const haystack = `${item.title} ${item.brand ?? ""}`.toLowerCase();
  const keywordTokens = keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);

  let score = 50;

  if (item.brand?.trim()) score += 12;
  if (isUsedCondition(item.condition)) score += 10;

  for (const token of keywordTokens) {
    score += haystack.includes(token) ? 8 : -6;
  }

  const fullKeyword = keyword.trim().toLowerCase();
  if (fullKeyword && haystack.includes(fullKeyword)) score += 12;

  let positiveHits = 0;
  for (const term of VINTAGE_POSITIVE_TERMS) {
    if (haystack.includes(term)) positiveHits += 1;
  }
  score += Math.min(positiveHits, 3) * 6;

  let negativeHits = 0;
  for (const term of VINTAGE_NEGATIVE_TERMS) {
    if (haystack.includes(term)) negativeHits += 1;
  }
  score -= negativeHits * 12;

  return Math.max(0, Math.min(100, score));
}

function matchesIncludeTerms(item: Listing, includeTerms: string[]) {
  if (!includeTerms.length) return true;
  const haystack = `${item.title} ${item.brand ?? ""}`.toLowerCase();
  return includeTerms.every((term) => haystack.includes(term.toLowerCase()));
}

function matchesExcludeTerms(item: Listing, excludeTerms: string[]) {
  if (!excludeTerms.length) return false;
  const haystack = `${item.title} ${item.brand ?? ""}`.toLowerCase();
  return excludeTerms.some((term) => haystack.includes(term.toLowerCase()));
}

function normalizeItem(item: any, keyword: string): Listing {
  const priceValue = Number(item.price?.value ?? 0);
  const shippingCost = item.shippingOptions?.[0]?.shippingCost?.value;
  const condition = item.condition ?? "Unknown";
  const brand = readBrandFromItemSpecifics(item);
  const vintageConfidence = rankVintageConfidence(
    {
      title: item.title ?? "",
      brand,
      condition,
    },
    keyword,
  );

  return {
    id: item.itemId,
    title: item.title,
    price: Number.isFinite(priceValue) ? priceValue : 0,
    currency: item.price?.currency ?? "USD",
    condition,
    brand,
    vintageConfidence,
    shipping: shippingCost ? `$${shippingCost} shipping` : undefined,
    image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl,
    url: item.itemWebUrl,
  };
}

export async function searchEbay(params: SearchParams): Promise<SearchResponse> {
  if (!params.keyword.trim()) {
    return { total: 0, offset: params.offset ?? 0, limit: params.limit ?? 24, items: [] };
  }

  const marketplaceId = params.marketplaceId || process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
  const token = await getAccessToken();

  const requestedLimit = params.limit ?? 24;
  const fetchLimit = Math.min(Math.max(requestedLimit * 4, 50), 200);

  const query = new URLSearchParams({
    q: params.keyword,
    limit: String(fetchLimit),
    offset: String(params.offset ?? 0),
  });

  if (params.categoryId) {
    query.set("category_ids", params.categoryId);
  }

  const filter = buildFilter(params);
  if (filter) {
    query.set("filter", filter);
  }

  const res = await fetch(`${EBAY_BROWSE_URL}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`eBay Browse error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const normalizedItems: Listing[] = Array.isArray(data.itemSummaries)
    ? data.itemSummaries.map((item: any) => normalizeItem(item, params.keyword))
    : [];

  const requireBrand = true;
  const requireUsed = params.requireUsed ?? true;
  const includeTerms = params.includeTerms ?? [];
  const excludeTerms = params.excludeTerms ?? [];
  const sortBy = params.sortBy ?? "best_match";

  const filteredItems = normalizedItems.filter((item) => {
    if (requireBrand && !isAllowedBrand(item.brand)) return false;
    if (requireUsed && !isUsedCondition(item.condition)) return false;
    if (!matchesIncludeTerms(item, includeTerms)) return false;
    if (matchesExcludeTerms(item, excludeTerms)) return false;
    return true;
  });

  filteredItems.sort((a, b) => {
    if (sortBy === "price_low") return a.price - b.price || b.vintageConfidence - a.vintageConfidence;
    if (sortBy === "price_high") return b.price - a.price || b.vintageConfidence - a.vintageConfidence;
    if (sortBy === "confidence_low") return a.vintageConfidence - b.vintageConfidence || a.price - b.price;
    return b.vintageConfidence - a.vintageConfidence || a.price - b.price;
  });

  const items = filteredItems.slice(0, requestedLimit);

  return {
    total: filteredItems.length,
    offset: data.offset ?? params.offset ?? 0,
    limit: params.limit ?? 24,
    items,
  };
}
