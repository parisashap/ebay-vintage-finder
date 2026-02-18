import { Listing, SearchResponse } from "@/types/listing";

type SearchParams = {
  keyword: string;
  brand?: string;
  gender?: "men" | "women";
  categoryId?: string;
  size?: string;
  color?: string;
  material?: string;
  era?: "70s" | "80s" | "90s" | "y2k" | "2000s" | "2000";
  sortBy?: "best_match" | "price_low" | "price_high" | "newest";
  strictness?: "relaxed" | "balanced" | "strict";
  excludeTerms?: string[];
  minPrice?: number;
  maxPrice?: number;
  condition?: "new" | "used" ;
  limit?: number;
  offset?: number;
  marketplaceId?: string;
};

type TokenCache = {
  token: string;
  expiresAt: number;
};

type EbayAspect = {
  name?: unknown;
  value?: unknown;
};

type EbayPrice = {
  value?: unknown;
  currency?: unknown;
};

type EbayShippingOption = {
  shippingCost?: {
    value?: unknown;
  };
};

type EbayImage = {
  imageUrl?: unknown;
};

type EbayItemSummary = {
  itemId?: unknown;
  title?: unknown;
  price?: EbayPrice;
  condition?: unknown;
  brand?: unknown;
  localizedAspects?: EbayAspect[] | unknown;
  shippingOptions?: EbayShippingOption[] | unknown;
  image?: EbayImage;
  thumbnailImages?: EbayImage[] | unknown;
  itemWebUrl?: unknown;
  itemCreationDate?: unknown;
};

let tokenCache: TokenCache | null = null;

const EBAY_ENV = process.env.EBAY_ENV === "sandbox" ? "sandbox" : "production";
const EBAY_BASE_URL =
  EBAY_ENV === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
const EBAY_OAUTH_URL = `${EBAY_BASE_URL}/identity/v1/oauth2/token`;
const EBAY_BROWSE_URL = `${EBAY_BASE_URL}/buy/browse/v1/item_summary/search`;
const EBAY_ITEM_URL = `${EBAY_BASE_URL}/buy/browse/v1/item`;

const CONDITION_MAP: Record<NonNullable<SearchParams["condition"]>, string> = {
  new: "1000",
  used: "3000"
};

const VINTAGE_POSITIVE_TERMS = [
  "vintage",
  "pre-owned",
  "made in usa",
  "single stitch",
  "80s",
  "90s",
  "70s",
  "2000s",
  "2000",
  "y2k",
  "Y2k",
  "distressed",
  "grunge",
  "faded",
  "babydoll",
];

const VINTAGE_NEGATIVE_TERMS = [
  "reproduction",
  "replica",
  "inspired",
  "style",
  "lookalike",
  "new with tags",
  "nwt",
  "fast fashion",
];

const BLOCKED_BRANDS = new Set(["unbranded", "unknown", "n/a", "na", "none", "no brand"]);
const FAST_FASHION_BRANDS = new Set([
  "shein",
  "romwe",
  "zaful",
  "fashion nova",
  "boohoo",
  "prettylittlething",
  "plt",
  "forever 21",
  "hm",
  "h&m",
  "zara",
  "bershka",
  "pull bear",
  "stradivarius",
  "primark",
  "new look",
  "missguided",
  "cotton on",
  "temu",
  "asos",
  "cider"
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

  if (params.condition) {
    filters.push(`conditionIds:{${CONDITION_MAP[params.condition]}}`);
  }

  return filters.length ? filters.join(",") : undefined;
}

function readBrand(item: EbayItemSummary): string | undefined {
  const directBrand = item.brand;
  if (typeof directBrand === "string" && directBrand.trim()) {
    return directBrand.trim();
  }

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

function normalizeBrand(brand: string): string {
  return brand.trim().toLowerCase().replace(/[.\-_/]/g, "").replace(/\s+/g, " ");
}

function isAllowedBrand(brand?: string): boolean {
  if (!brand?.trim()) return false;
  return !BLOCKED_BRANDS.has(normalizeBrand(brand));
}

function isFastFashionBrand(brand?: string): boolean {
  if (!brand?.trim()) return false;
  return FAST_FASHION_BRANDS.has(normalizeBrand(brand));
}

function readAspectValues(item: EbayItemSummary, aspectNames: string[]): string[] {
  const lowerNames = new Set(aspectNames.map((name) => name.toLowerCase()));
  const aspects = Array.isArray(item.localizedAspects) ? item.localizedAspects : [];
  const values: string[] = [];

  for (const aspect of aspects) {
    if (typeof aspect?.name !== "string") continue;
    if (!lowerNames.has(aspect.name.toLowerCase())) continue;
    const aspectValues = Array.isArray(aspect.value) ? aspect.value : [];
    for (const value of aspectValues) {
      if (typeof value === "string" && value.trim()) values.push(value.trim());
    }
  }

  return values;
}

function firstAspectValue(item: EbayItemSummary, aspectNames: string[]): string | undefined {
  const values = readAspectValues(item, aspectNames);
  return values[0];
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

function normalizeItem(item: EbayItemSummary, keyword: string): Listing {
  const priceValue = Number(item.price?.value ?? 0);
  const shippingOptions = Array.isArray(item.shippingOptions) ? item.shippingOptions : [];
  const shippingCost = shippingOptions[0]?.shippingCost?.value;
  const condition = typeof item.condition === "string" ? item.condition : "Unknown";
  const brand = readBrand(item);
  const size = firstAspectValue(item, ["size", "size type"]);
  const color = firstAspectValue(item, ["color"]);
  const material = firstAspectValue(item, ["material"]);
  const title = typeof item.title === "string" ? item.title : "";
  const vintageConfidence = rankVintageConfidence(
    {
      title,
      brand,
      condition,
    },
    keyword,
  );

  return {
    id: typeof item.itemId === "string" ? item.itemId : "",
    title,
    price: Number.isFinite(priceValue) ? priceValue : 0,
    currency: typeof item.price?.currency === "string" ? item.price.currency : "USD",
    condition,
    brand,
    size,
    color,
    material,
    createdAt: typeof item.itemCreationDate === "string" ? item.itemCreationDate : undefined,
    vintageConfidence,
    shipping: typeof shippingCost === "string" || typeof shippingCost === "number" ? `$${shippingCost} shipping` : undefined,
    image:
      typeof item.image?.imageUrl === "string"
        ? item.image.imageUrl
        : Array.isArray(item.thumbnailImages) && typeof item.thumbnailImages[0]?.imageUrl === "string"
          ? item.thumbnailImages[0].imageUrl
          : undefined,
    url: typeof item.itemWebUrl === "string" ? item.itemWebUrl : "",
  };
}

async function enrichMissingBrands(
  items: Listing[],
  token: string,
  marketplaceId: string,
): Promise<Listing[]> {
  const MAX_LOOKUPS = 40;
  const CONCURRENCY = 8;
  const output = [...items];
  const missingIndexes: number[] = [];

  for (let i = 0; i < output.length; i += 1) {
    if (!output[i].brand?.trim()) missingIndexes.push(i);
    if (missingIndexes.length >= MAX_LOOKUPS) break;
  }

  for (let i = 0; i < missingIndexes.length; i += CONCURRENCY) {
    const batch = missingIndexes.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (index) => {
        const item = output[index];
        try {
          const res = await fetch(`${EBAY_ITEM_URL}/${encodeURIComponent(item.id)}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
            },
            cache: "no-store",
          });
          if (!res.ok) return;
          const detail = await res.json();
          const brand = readBrand(detail);
          if (brand?.trim()) {
            output[index] = { ...item, brand: brand.trim() };
          }
        } catch {
          // Best-effort enrichment only.
        }
      }),
    );
  }

  return output;
}

function hasY2KToken(text: string): boolean {
  const t = text.toLowerCase();
  return /\by2k\b/.test(t) || /\b2000s\b/.test(t) || /\bearly\s*2000s?\b/.test(t) || /\b00s\b/.test(t);
}

function ensureVintageKeyword(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;
  if (/\bvintage\b/i.test(trimmed)) return trimmed;
  return `${trimmed} vintage`;
}

function ensureGenderKeyword(query: string, gender?: SearchParams["gender"]): string {
  if (!gender) return query;

  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  if (gender === "men") {
    if (/\bmen('?s)?\b|\bmale\b/i.test(trimmed)) return trimmed;
    return `${trimmed} mens`;
  }

  if (/\bwomen('?s)?\b|\bfemale\b|\blad(?:y|ies)\b/i.test(trimmed)) return trimmed;
  return `${trimmed} womens`;
}

function buildQueryVariants(params: SearchParams): string[] {
  const baseKeyword = params.brand?.trim()
    ? `${params.keyword} ${params.brand.trim()}`.trim()
    : params.keyword.trim();
  const vintageBase = ensureVintageKeyword(baseKeyword);
  const base = ensureGenderKeyword(vintageBase, params.gender);

  // Only do the two-search strategy for Y2K/2000 era selections.
  if (params.era !== "y2k" && params.era !== "2000s" && params.era !== "2000") return [base];

  // If they already typed y2k/2000s, still run both variants for coverage
  const variants = new Set<string>();

  // Keep “base + y2k” and “base + 2000s” as two separate searches
  if (hasY2KToken(base)) {
    // If base already includes one token, still add the other token variant
    variants.add(base.includes("y2k") ? base : `${base} y2k`.trim());
    variants.add(base.includes("2000") || base.includes("2000s") || base.includes("00s") ? base : `${base} 2000s`.trim());
  } else {
    variants.add(`${base} y2k`.trim());
    variants.add(`${base} 2000s`.trim());
  }

  return Array.from(variants);
}

async function fetchBrowseSearch(
  token: string,
  marketplaceId: string,
  params: SearchParams,
  q: string,
  browseLimit: number,
  browseOffset: number,
): Promise<EbayItemSummary[]> {
  const query = new URLSearchParams({
    q,
    limit: String(browseLimit),
    offset: String(browseOffset),
  });

  if (params.categoryId) {
    query.set("category_ids", params.categoryId);
  }

  if (params.brand?.trim() && params.categoryId) {
    const escapedBrand = params.brand.trim().replace(/'/g, "\\'");
    query.set("aspect_filter", `categoryId:${params.categoryId},Brand:{${escapedBrand}}`);
  }

  const filter = buildFilter(params);
  if (filter) query.set("filter", filter);

  const res = await fetch(`${EBAY_BROWSE_URL}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`eBay Browse error (${q}): ${res.status} ${errorText}`);
  }

  const data = (await res.json()) as { itemSummaries?: unknown };
  return Array.isArray(data.itemSummaries) ? (data.itemSummaries as EbayItemSummary[]) : [];
}

export async function searchEbay(params: SearchParams): Promise<SearchResponse> {
  if (!params.keyword.trim()) {
    return { total: 0, offset: params.offset ?? 0, limit: params.limit ?? 24, hasMore: false, items: [] };
  }

  const marketplaceId = params.marketplaceId || process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
  const token = await getAccessToken();

  const requestedLimit = params.limit ?? 24;
  const baseOffset = params.offset ?? 0;
  const browseLimit = requestedLimit;
  const CANDIDATE_PAGES = 5;

  // Two-search strategy for Y2K: run separate queries and merge/dedupe results.
  const queryVariants = buildQueryVariants(params);
  const fetchJobs: Promise<EbayItemSummary[]>[] = [];
  for (const qv of queryVariants) {
    for (let page = 0; page < CANDIDATE_PAGES; page += 1) {
      const browseOffset = baseOffset + page * requestedLimit;
      fetchJobs.push(fetchBrowseSearch(token, marketplaceId, params, qv, browseLimit, browseOffset));
    }
  }

  const fetchResults = await Promise.allSettled(fetchJobs);
  const rawResultsArrays = fetchResults
    .filter((result): result is PromiseFulfilledResult<EbayItemSummary[]> => result.status === "fulfilled")
    .map((result) => result.value);

  if (!rawResultsArrays.length) {
    const firstFailure = fetchResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    throw new Error(firstFailure?.reason instanceof Error ? firstFailure.reason.message : "Search failed");
  }

  // Dedupe by itemId across both searches
  const mergedMap = new Map<string, EbayItemSummary>();
  for (const arr of rawResultsArrays) {
    for (const item of arr) {
      const id = item?.itemId;
      if (typeof id === "string" && id) mergedMap.set(id, item);
    }
  }
  const mergedRaw = Array.from(mergedMap.values());

  // Normalize using the base keyword (not the variant) so scoring stays consistent
  const normalizedItems: Listing[] = mergedRaw.map((item) => normalizeItem(item, params.keyword));
  const enrichedItems = await enrichMissingBrands(normalizedItems, token, marketplaceId);

  const strictness = params.strictness ?? "balanced";
  const minConfidence = strictness === "relaxed" ? 30 : strictness === "strict" ? 65 : 45;
  const excludeTerms = (params.excludeTerms ?? []).map((term) => term.toLowerCase());

  const matchesText = (haystack: string, needle?: string) =>
    !needle || haystack.includes(needle.toLowerCase());

  const matchesEra = (haystack: string) => {
    if (!params.era) return true;
    if (params.era === "70s") return /70s|70's|1970|seventies/.test(haystack);
    if (params.era === "80s") return /80s|80's|1980|eighties/.test(haystack);
    if (params.era === "90s") return /90s|90's|1990|nineties/.test(haystack);
    if (params.era === "2000") return /\b2000\b|y2k|2000s|00s/.test(haystack);
    return /y2k|2000|00s|2000s/.test(haystack);
  };

  const matchesGender = (haystack: string) => {
    if (!params.gender) return true;
    if (params.gender === "men") return /\bmen('?s)?\b|\bmale\b/.test(haystack);
    return /\bwomen('?s)?\b|\bfemale\b|\blad(?:y|ies)\b/.test(haystack);
  };

  const filteredItems = enrichedItems
    .filter((item) => {
      if (!isAllowedBrand(item.brand)) return false;

      const haystack = [item.title, item.brand, item.size, item.color, item.material, item.condition]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!matchesText(haystack, params.brand)) return false;
      if (!matchesText(haystack, params.size)) return false;
      if (!matchesText(haystack, params.color)) return false;
      if (!matchesText(haystack, params.material)) return false;
      if (!matchesEra(haystack)) return false;
      if (!matchesGender(haystack)) return false;

      if (excludeTerms.some((term) => haystack.includes(term))) return false;

      if (strictness !== "relaxed" && item.vintageConfidence < minConfidence) return false;

      if (strictness === "strict" && !isUsedCondition(item.condition)) return false;

      return true;
    })
    .sort((a, b) => {
      const aFastFashion = isFastFashionBrand(a.brand);
      const bFastFashion = isFastFashionBrand(b.brand);
      if (aFastFashion !== bFastFashion) return aFastFashion ? 1 : -1;

      const sortBy = params.sortBy ?? "best_match";
      if (sortBy === "price_low") return a.price - b.price || b.vintageConfidence - a.vintageConfidence;
      if (sortBy === "price_high") return b.price - a.price || b.vintageConfidence - a.vintageConfidence;
      if (sortBy === "newest") {
        const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bTs - aTs || b.vintageConfidence - a.vintageConfidence;
      }
      return b.vintageConfidence - a.vintageConfidence || a.price - b.price;
    });

  const items = filteredItems.slice(0, requestedLimit);
  const hasMore = items.length >= requestedLimit;

  return {
    total: filteredItems.length,
    offset: baseOffset, // no single "data" response anymore
    limit: params.limit ?? 24,
    hasMore,
    items,
  };
}
