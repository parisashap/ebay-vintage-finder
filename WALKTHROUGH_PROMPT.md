# ChatGPT Walkthrough Prompt

Use this prompt in ChatGPT to generate your walkthrough script and interview-style dialogue:

```text
You are helping me present a technical project walkthrough to a company.
Write in a confident, practical engineering tone (clear, honest, no hype).

Project:
- Name: eBay Vintage Finder
- Stack: Next.js + TypeScript
- Purpose: Search eBay listings and surface likely authentic vintage items.

What it does:
- Fetches listings from eBay Browse API.
- Computes a custom vintage confidence score (`vintageConfidence`, 0-100).
- Applies hard authenticity/relevance filters.
- Uses staged fallback to avoid zero results on niche queries.
- Ranks results based on user sort intent, with anti-fast-fashion demotion.

Scoring logic:
- Start at 50.
- +12 if brand is present.
- +10 if condition is used/pre-owned.
- For each query token: +8 if present, -6 if missing.
- +12 if full query phrase appears.
- +6 per vintage-positive term (max 3 hits).
- -12 per vintage-negative term.
- Clamp to 0..100.

Hard filters (always exclude):
- Blocked brands (e.g., unknown/unbranded).
- User explicit filters (brand/size/color/material).
- Exclude terms list.
- Known multi-quantity listings (`availableQuantity > 1`).
- Multi-size inventory-like listings (multiple sizes or "choose/select size" style text).
- New with tags / NWT.

Fallback strategy:
- Primary stage: full constraints and confidence gate.
- Fallback stage: relax era/gender and lower confidence floor.
- Backup stage: hard filters only, no confidence floor.

Ranking:
- Fast fashion brands are pushed down.
- Sort options:
  - best_match: confidence desc, then price asc
  - price_low: price asc, then confidence desc
  - price_high: price desc, then confidence desc
  - newest: date desc, then confidence desc

Now produce:
1) A 30-second elevator pitch.
2) A 2-minute detailed walkthrough script.
3) A "live demo talk track" I can say while clicking through the app.
4) 8 likely interviewer/company questions with strong sample answers.
5) A short “limitations + next improvements” section (metrics, calibration, A/B testing, false-positive tuning).

Constraints:
- Keep explanations technically accurate and easy to follow.
- Emphasize tradeoffs and product thinking.
- Do not exaggerate outcomes or claim ML when it is rule-based scoring.
```
