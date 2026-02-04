import { Listing } from "@/types/listing";

export default function ListingGrid({ items }: { items: Listing[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
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
          <div className="flex flex-1 flex-col gap-2 p-4">
            <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">
              {item.title}
            </h3>
            <div className="text-sm font-semibold text-stone-900">
              {item.currency} {item.price.toFixed(2)}
            </div>
            <div className="text-xs text-stone-600">Condition: {item.condition}</div>
            {item.shipping && <div className="text-xs text-stone-500">{item.shipping}</div>}
            <div className="mt-auto text-xs font-medium text-stone-500">View on eBay →</div>
          </div>
        </a>
      ))}
    </div>
  );
}
