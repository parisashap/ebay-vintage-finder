#!/usr/bin/env bash
set -euo pipefail

# Load local env file if present so checks match local runtime expectations.
if [[ -f .env.local ]]; then
  set -a
  source .env.local
  set +a
fi

echo "Running Vercel preflight checks..."

if [[ -n "${NODE_ENV:-}" ]]; then
  case "${NODE_ENV}" in
    development|production|test)
      ;;
    *)
      echo "ERROR: NODE_ENV is set to non-standard value: '${NODE_ENV}'"
      echo "Use development, production, or test; or leave it unset."
      exit 1
      ;;
  esac
fi

missing=()
for var in EBAY_CLIENT_ID EBAY_CLIENT_SECRET; do
  if [[ -z "${!var:-}" ]]; then
    missing+=("${var}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "ERROR: Missing required env vars: ${missing[*]}"
  echo "Set them in .env.local and in Vercel Project Settings > Environment Variables."
  exit 1
fi

if [[ "${EBAY_CLIENT_ID}" == *"-SBX-"* && "${EBAY_ENV:-}" != "sandbox" ]]; then
  echo "ERROR: EBAY_CLIENT_ID appears to be Sandbox credentials, but EBAY_ENV is not 'sandbox'."
  echo "Set EBAY_ENV=sandbox for Sandbox API credentials."
  exit 1
fi

echo "Environment checks passed. Running production build..."
npm run build

echo "Preflight passed. Ready to deploy to Vercel."
