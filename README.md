# eBay Vintage Finder

Next.js app that searches eBay listings and ranks them by a custom `vintageConfidence` score (0-100).  
Built for fast vintage discovery with practical filtering, ranking, and fallback behavior for unusual queries.

## Core Logic

### Vintage Confidence Percentage
The percentage shown in the UI (`Vintage confidence: X%`) comes from `rankVintageConfidence` in `lib/ebay.ts`.

Score starts at `50`, then:
- `+12` if brand is present
- `+10` if condition appears used / pre-owned
- For each keyword token:
- `+8` if token is found in title/brand text
- `-6` if token is missing
- `+12` if the full keyword phrase appears
- `+6` per vintage-positive term hit (cap: 3 hits, max `+18`)
- `-12` per vintage-negative term hit
- Final score is clamped to `0..100`

### Filtering and Ranking Pipeline
The search flow in `searchEbay` (`lib/ebay.ts`) is:

1. Fetch candidate listings from eBay (including query variants for Y2K/2000s coverage)
2. Normalize and enrich item data (brand/attributes)
3. Apply hard filters (blocked brands, explicit text filters, exclude terms)
4. Apply staged vintage filtering:
- `primary`: full filters and stricter confidence thresholds
- `fallback`: relaxed era/gender + lower confidence threshold
- `backup`: hard filters only, no confidence floor
5. Rank results:
- Fast fashion brands are pushed lower
- Then apply selected sort:
- `best_match`: highest confidence first, then lower price
- `price_low`: lower price first, then confidence
- `price_high`: higher price first, then confidence
- `newest`: newest first, then confidence

This staged fallback prevents zero-results for interesting or niche queries while keeping result quality logical.

## Features

- eBay Browse API search
- Vintage confidence scoring
- Era and gender-aware query expansion (Y2K/2000s support)
- Strictness modes: `relaxed`, `balanced`, `strict`
- Fast-fashion demotion in ranking

## Local Setup

1. Install deps:
```bash
npm install
```

2. Configure `.env.local`:
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENV` (`sandbox` for sandbox credentials, else omit for production)
- `EBAY_MARKETPLACE_ID` (optional, defaults to `EBAY_US`)

3. Run dev server:
```bash
npm run dev
```

4. Open:
`http://localhost:3000`

## Pre-Deploy Check

Run before deploy:

```bash
npm run preflight:vercel
```

Checks:
- Required eBay env vars are present
- Sandbox credentials are paired with `EBAY_ENV=sandbox`
- Production build succeeds

## Deploy Notes (Vercel)

Set in Vercel Project Settings -> Environment Variables:
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_ENV`
- `EBAY_MARKETPLACE_ID`

Do not manually set `NODE_ENV` in Vercel.
