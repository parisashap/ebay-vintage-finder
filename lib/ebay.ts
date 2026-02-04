import { Listing, SearchResponse } from "@/types/listing";

type SearchParams = {
  keyword: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: "new" | "used" | "refurbished" | "for_parts";
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

  if (params.condition) {
    filters.push(`conditionIds:{${CONDITION_MAP[params.condition]}}`);
  }

  return filters.length ? filters.join(",") : undefined;
}

function normalizeItem(item: any): Listing {
  const priceValue = Number(item.price?.value ?? 0);
  const shippingCost = item.shippingOptions?.[0]?.shippingCost?.value;

  return {
    id: item.itemId,
    title: item.title,
    price: Number.isFinite(priceValue) ? priceValue : 0,
    currency: item.price?.currency ?? "USD",
    condition: item.condition ?? "Unknown",
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

  const query = new URLSearchParams({
    q: params.keyword,
    limit: String(params.limit ?? 24),
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
  const items = Array.isArray(data.itemSummaries) ? data.itemSummaries.map(normalizeItem) : [];

  return {
    total: data.total ?? items.length,
    offset: data.offset ?? params.offset ?? 0,
    limit: data.limit ?? params.limit ?? 24,
    items,
  };
}
