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
  categoryId: "",
  condition: "",
  minPrice: "",
  maxPrice: "",
  minConfidence: "60",
  includeTerms: "",
  excludeTerms: "",
  requireUsed: true,
  requireBrand: true,
  sortBy: "best_match",
};

export default function HomePage() {
  const supabaseEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [values, setValues] = useState<SearchFormValues>(defaultValues);
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
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

  const buildQuery = (nextOffset: number) => {
    const params = new URLSearchParams({
      keyword: values.keyword,
      limit: String(PAGE_SIZE),
      offset: String(nextOffset),
      minConfidence: values.minConfidence || "0",
      requireUsed: String(values.requireUsed),
      requireBrand: String(values.requireBrand),
      sortBy: values.sortBy,
    });

    if (values.categoryId) params.set("categoryId", values.categoryId);
    if (values.condition) params.set("condition", values.condition);
    if (values.minPrice) params.set("minPrice", values.minPrice);
    if (values.maxPrice) params.set("maxPrice", values.maxPrice);
    if (values.includeTerms.trim()) params.set("includeTerms", values.includeTerms);
    if (values.excludeTerms.trim()) params.set("excludeTerms", values.excludeTerms);

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

  const hasMore = items.length < total;

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-stone-100 px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                eBay Vintage Finder
              </p>
              <h1 className="text-3xl font-semibold text-stone-900 md:text-4xl">
                Discover vintage pieces without the clutter.
              </h1>
              <p className="max-w-2xl text-sm text-stone-600">
                Search eBay listings, filter by condition and price, and keep paging until you find
                the perfect vintage find.
              </p>
            </div>
            {supabaseEnabled ? (
              <AuthButton onUserChange={setUser} />
            ) : (
              <div className="text-xs text-stone-500">
                Add Supabase env vars to enable login and favorites.
              </div>
            )}
          </div>
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
