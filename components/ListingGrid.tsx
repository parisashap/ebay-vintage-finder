"use client";

import { Listing } from "@/types/listing";

type ListingGridProps = {
  items: Listing[];
  canFavorite: boolean;
  favoriteIds: Set<string>;
  loadingFavoriteIds: Set<string>;
  onToggleFavorite: (item: Listing) => void;
};

export default function ListingGrid({
  items,
  canFavorite,
  favoriteIds,
  loadingFavoriteIds,
  onToggleFavorite,
}: ListingGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <a href={item.url} target="_blank" rel="noreferrer">
            <div className="aspect-[4/5] overflow-hidden bg-stone-100">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-stone-400">
                  No image
                </div>
              )}
            </div>
          </a>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <a href={item.url} target="_blank" rel="noreferrer">
              <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">{item.title}</h3>
            </a>
            <div className="text-sm font-semibold text-stone-900">
              {item.currency} {item.price.toFixed(2)}
            </div>
            <div className="text-xs text-stone-600">Condition: {item.condition}</div>
            {item.shipping && <div className="text-xs text-stone-500">{item.shipping}</div>}
            <div className="mt-auto flex items-center justify-between gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-stone-500"
              >
                View on eBay →
              </a>
              <button
                type="button"
                disabled={!canFavorite || loadingFavoriteIds.has(item.id)}
                onClick={() => onToggleFavorite(item)}
                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingFavoriteIds.has(item.id)
                  ? "Saving..."
                  : favoriteIds.has(item.id)
                    ? "Liked"
                    : canFavorite
                      ? "Like"
                      : "Sign in to like"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
