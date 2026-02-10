import React from "react";

export type SearchFormValues = {
  keyword: string;
  maxPrice: string;
  condition: string;
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
      className="grid gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-stone-200 md:grid-cols-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="md:col-span-2">
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
      <div className="flex items-end">
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
