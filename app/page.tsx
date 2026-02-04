"use client";

import { useState } from "react";
import ListingGrid from "@/components/ListingGrid";
import SearchForm, { SearchFormValues } from "@/components/SearchForm";
import { Listing, SearchResponse } from "@/types/listing";

const PAGE_SIZE = 24;

const defaultValues: SearchFormValues = {
  keyword: "",
  categoryId: "",
  condition: "",
};

export default function HomePage() {
  const [values, setValues] = useState<SearchFormValues>(defaultValues);
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const buildQuery = (nextOffset: number) => {
    const params = new URLSearchParams({
      keyword: values.keyword,
      limit: String(PAGE_SIZE),
      offset: String(nextOffset),
    });

    if (values.categoryId) params.set("categoryId", values.categoryId);
    if (values.condition) params.set("condition", values.condition);

    return params.toString();
  };

  const runSearch = async (nextOffset: number, append: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/search?${buildQuery(nextOffset)}`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Search failed");
      }
      const data = (await res.json()) as SearchResponse;
      setTotal(data.total);
      setOffset(data.offset + data.limit);
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    setItems([]);
    setOffset(0);
    runSearch(0, false);
  };

  const onLoadMore = () => {
    runSearch(offset, true);
  };

  const hasMore = items.length < total;

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-stone-100 px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            eBay Vintage Finder
          </p>
          <h1 className="text-3xl font-semibold text-stone-900 md:text-4xl">
            Discover vintage pieces without the clutter.
          </h1>
          <p className="max-w-2xl text-sm text-stone-600">
            Search eBay listings, filter by condition and price, and keep paging until you find the
            perfect vintage find.
          </p>
        </header>

        <SearchForm values={values} onChange={setValues} onSubmit={onSubmit} loading={loading} />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !items.length && (
          <div className="rounded-2xl bg-white/70 p-10 text-center text-sm text-stone-500">
            Loading results...
          </div>
        )}

        {!loading && hasSearched && items.length > 0 && <ListingGrid items={items} />}

        {hasSearched && !items.length && !loading && !error && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-10 text-center text-sm text-stone-500">
            No listings found. Try widening your search.
          </div>
        )}

        {hasSearched && items.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-500">
              Showing {items.length} of {total} results
            </div>
            <button
              onClick={onLoadMore}
              disabled={!hasMore || loading}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : hasMore ? "Load more" : "No more results"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
