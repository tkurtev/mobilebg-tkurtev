"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORT_OPTIONS, type SortKey } from "../params";

export function SortSelect({ value }: { value: SortKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="hidden text-sm text-muted sm:block">
        Подреди
      </label>
      <select
        id="sort"
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("page");
          if (event.target.value === "newest") params.delete("sort");
          else params.set("sort", event.target.value);
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
        className="h-9 appearance-none rounded-md border border-line-strong bg-surface bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8 pl-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2366707c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
