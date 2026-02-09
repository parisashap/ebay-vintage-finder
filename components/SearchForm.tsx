import React from "react";

export type SearchFormValues = {
  keyword: string;
  categoryId: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  includeTerms: string;
  excludeTerms: string;
  requireUsed: boolean;
  requireBrand: boolean;
  sortBy: "best_match" | "price_low" | "price_high" | "confidence_low";
};

type SearchFormProps = {
  values: SearchFormValues;
  onChange: (values: SearchFormValues) => void;
  onSubmit: () => void;
  loading: boolean;
};

export default function SearchForm({ values, onChange, onSubmit, loading }: SearchFormProps) {
  return (
    <form
      className="grid gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-stone-200 md:grid-cols-12"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="md:col-span-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Keyword
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          placeholder="e.g. vintage leather jacket"
          value={values.keyword}
          onChange={(event) => onChange({ ...values, keyword: event.target.value })}
          required
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Category (optional)
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          placeholder="e.g. 11450"
          value={values.categoryId}
          onChange={(event) => onChange({ ...values, categoryId: event.target.value })}
        />
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
          <option value="refurbished">Refurbished</option>
          <option value="for_parts">For parts</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Min price
        </label>
        <input
          type="number"
          min="0"
          step="1"
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          placeholder="0"
          value={values.minPrice}
          onChange={(event) => onChange({ ...values, minPrice: event.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Max price
        </label>
        <input
          type="number"
          min="0"
          step="1"
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          placeholder="300"
          value={values.maxPrice}
          onChange={(event) => onChange({ ...values, maxPrice: event.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Sort
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          value={values.sortBy}
          onChange={(event) =>
            onChange({
              ...values,
              sortBy: event.target.value as SearchFormValues["sortBy"],
            })
          }
        >
          <option value="best_match">Best vintage match</option>
          <option value="price_low">Price low to high</option>
          <option value="price_high">Price high to low</option>
          <option value="confidence_low">Confidence low to high</option>
        </select>
      </div>
      <div className="md:col-span-6">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Must include terms (comma separated)
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          placeholder="single stitch, made in usa"
          value={values.includeTerms}
          onChange={(event) => onChange({ ...values, includeTerms: event.target.value })}
        />
      </div>
      <div className="md:col-span-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Exclude terms (comma separated)
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
          placeholder="replica, inspired, nwt"
          value={values.excludeTerms}
          onChange={(event) => onChange({ ...values, excludeTerms: event.target.value })}
        />
      </div>
      <div className="md:col-span-2 flex flex-col justify-end gap-2 pb-1">
        <label className="flex items-center gap-2 text-xs text-stone-700">
          <input
            type="checkbox"
            checked={values.requireUsed}
            onChange={(event) => onChange({ ...values, requireUsed: event.target.checked })}
          />
          Used only
        </label>
        <label className="flex items-center gap-2 text-xs text-stone-700">
          <input
            type="checkbox"
            checked={values.requireBrand}
            onChange={(event) => onChange({ ...values, requireBrand: event.target.checked })}
          />
          Brand required
        </label>
      </div>
      <div className="flex items-end md:col-span-2">
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
