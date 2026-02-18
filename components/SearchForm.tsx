import React, { useState } from "react";

export type SearchFormValues = {
  keyword: string;
  brand: string;
  gender: "" | "men" | "women";
  maxPrice: string;
  condition: string;
  size: string;
  color: string;
  material: string;
  era: "" | "70s" | "80s" | "90s" | "y2k" | "2000s" | "2000";
  sortBy: "best_match" | "price_low" | "price_high" | "newest";
};

type SearchFormProps = {
  values: SearchFormValues;
  onChange: (values: SearchFormValues) => void;
  onSubmit: () => void;
  loading: boolean;
};

export default function SearchForm({ values, onChange, onSubmit, loading }: SearchFormProps) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const advancedFiltersActive = Boolean(
    values.brand.trim() ||
      values.gender ||
      values.condition ||
      values.size.trim() ||
      values.color.trim() ||
      values.material.trim() ||
      values.era,
  );

  return (
    <form
      className="space-y-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-stone-200"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Filters</p>
        <p className="text-sm text-stone-600">Refine your search</p>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Keyword
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          placeholder="e.g. leather jacket"
          value={values.keyword}
          onChange={(event) => onChange({ ...values, keyword: event.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Max price (optional)
        </label>
        <input
          type="number"
          min="0"
          step="1"
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          placeholder="e.g. 120"
          value={values.maxPrice}
          onChange={(event) => onChange({ ...values, maxPrice: event.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Sort
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          value={values.sortBy}
          onChange={(event) =>
            onChange({ ...values, sortBy: event.target.value as SearchFormValues["sortBy"] })
          }
        >
          <option value="best_match">Best vintage match</option>
          <option value="price_low">Price low</option>
          <option value="price_high">Price high</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <div>
        <button
          type="button"
          onClick={() => setShowMoreFilters((prev) => !prev)}
          className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-100"
          aria-expanded={showMoreFilters}
        >
          {showMoreFilters
            ? "Hide more filters"
            : advancedFiltersActive
              ? "More filters (active)"
              : "More filters"}
        </button>
      </div>
      {showMoreFilters && (
        <>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Brand (optional)
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              placeholder="e.g. Levi's"
              value={values.brand}
              onChange={(event) => onChange({ ...values, brand: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Shop for
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              value={values.gender}
              onChange={(event) =>
                onChange({ ...values, gender: event.target.value as SearchFormValues["gender"] })
              }
            >
              <option value="">Any</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Condition
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              value={values.condition}
              onChange={(event) => onChange({ ...values, condition: event.target.value })}
            >
              <option value="">Any</option>
              <option value="used">Used</option>
              <option value="new">New</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Size
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              placeholder="e.g. small"
              value={values.size}
              onChange={(event) => onChange({ ...values, size: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Color
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              placeholder="e.g. black"
              value={values.color}
              onChange={(event) => onChange({ ...values, color: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Material
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              placeholder="e.g. cotton"
              value={values.material}
              onChange={(event) => onChange({ ...values, material: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Era
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              value={values.era}
              onChange={(event) =>
                onChange({ ...values, era: event.target.value as SearchFormValues["era"] })
              }
            >
              <option value="">Any era</option>
              <option value="70s">70s</option>
              <option value="80s">80s</option>
              <option value="90s">90s</option>
              <option value="y2k">Y2K</option>
              <option value="2000s">2000s</option>
              <option value="2000">2000</option>
            </select>
          </div>
        </>
      )}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
    </form>
  );
}
