"use client";

import { useCallback, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import ListingGrid from "@/components/ListingGrid";
import SearchForm, { SearchFormValues } from "@/components/SearchForm";
import AuthButton from "@/components/AuthButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Listing, SearchResponse } from "@/types/listing";

const PAGE_SIZE = 24;

const defaultValues: SearchFormValues = {
  keyword: "",
  brand: "",
  gender: "",
  maxPrice: "",
  condition: "",
  size: "",
  color: "",
  material: "",
  era: "",
  sortBy: "best_match",
};

export default function HomePage() {
  const supabaseEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [values, setValues] = useState<SearchFormValues>(defaultValues);
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loadingFavoriteIds, setLoadingFavoriteIds] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(
    async (userId: string) => {
      if (!supabaseEnabled) return;
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("favorites")
        .select("item_id")
        .eq("user_id", userId);

      if (error) {
        setError(error.message);
        return;
      }

      setFavoriteIds(new Set((data ?? []).map((row) => row.item_id as string)));
    },
    [supabaseEnabled],
  );

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    loadFavorites(user.id);
  }, [loadFavorites, user]);

  const buildQuery = (targetOffset: number) => {
    const params = new URLSearchParams({
      keyword: values.keyword,
      limit: String(PAGE_SIZE),
      offset: String(targetOffset),
    });

    if (values.maxPrice) params.set("maxPrice", values.maxPrice);
    if (values.brand.trim()) params.set("brand", values.brand.trim());
    if (values.gender) params.set("gender", values.gender);
    if (values.condition) params.set("condition", values.condition);
    if (values.size.trim()) params.set("size", values.size.trim());
    if (values.color.trim()) params.set("color", values.color.trim());
    if (values.material.trim()) params.set("material", values.material.trim());
    if (values.era) params.set("era", values.era);
    params.set("sortBy", values.sortBy);

    return params.toString();
  };

  const runSearch = async (targetOffset: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/search?${buildQuery(targetOffset)}`);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Search failed");
      }
      const data = (await res.json()) as SearchResponse;
      setTotal(data.total);
      setCurrentOffset(data.offset);
      setHasMoreResults(data.hasMore);
      setItems(data.items);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    setItems([]);
    setCurrentOffset(0);
    setHasMoreResults(false);
    runSearch(0);
  };

  const onNextPage = () => {
    runSearch(currentOffset + PAGE_SIZE);
  };

  const onPreviousPage = () => {
    runSearch(Math.max(0, currentOffset - PAGE_SIZE));
  };

  const onToggleFavorite = async (item: Listing) => {
    if (!supabaseEnabled) {
      setError("Supabase is not configured yet.");
      return;
    }

    if (!user) {
      setError("Sign in to save favorites.");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    setLoadingFavoriteIds((prev) => new Set(prev).add(item.id));
    setError(null);

    try {
      if (favoriteIds.has(item.id)) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", item.id);
        if (error) throw error;

        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          item_id: item.id,
          title: item.title,
          image_url: item.image ?? null,
          item_url: item.url,
          price_value: item.price,
          price_currency: item.currency,
        });
        if (error) throw error;

        setFavoriteIds((prev) => new Set(prev).add(item.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update favorite.");
    } finally {
      setLoadingFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-stone-100 px-4 py-10">
      <div className="mx-auto flex w-full flex-col gap-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <p className="text-4xl font-bold tracking-tight text-stone-900 md:text-5xl">
                VintagEbay
              </p>
              <h1 className="text-xl font-semibold text-stone-700 md:text-2xl">
                Discover vintage pieces without the clutter.
              </h1>
              <p className="max-w-2xl text-sm text-stone-600">
                Search eBay listings, filter by condition and price, and keep paging until you find
                the perfect find.
              </p>
            </div>
            {supabaseEnabled ? (
              <AuthButton onUserChange={setUser} />
            ) : null}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
          <aside className="order-1 lg:order-1 lg:sticky lg:top-2 lg:w-[340px]">
            <SearchForm values={values} onChange={setValues} onSubmit={onSubmit} loading={loading} />
          </aside>
          <section className="order-2 space-y-6 lg:order-2">
            {hasSearched && !loading && (
              <div className="text-sm font-medium text-stone-600">Found {total} listings</div>
            )}

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

            {!loading && hasSearched && items.length > 0 && (
              <ListingGrid
                items={items}
                canFavorite={Boolean(user) && supabaseEnabled}
                favoriteIds={favoriteIds}
                loadingFavoriteIds={loadingFavoriteIds}
                onToggleFavorite={onToggleFavorite}
              />
            )}

            {hasSearched && !items.length && !loading && !error && (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-10 text-center text-sm text-stone-500">
                No listings found. Try widening your search.
              </div>
            )}
          </section>
        </div>

        {hasSearched && items.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-500">
              Page {Math.floor(currentOffset / PAGE_SIZE) + 1} · Showing {items.length} listings
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPreviousPage}
                disabled={loading || currentOffset === 0}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={onNextPage}
                disabled={loading || !hasMoreResults}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
