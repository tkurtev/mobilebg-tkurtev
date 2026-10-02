"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { DEALER_LISTING_FILTERS, type DealerListingFilter } from "../params";

export function DealerListingsToolbar({ status, q }: { status: DealerListingFilter; q: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);

  function navigate(nextStatus: string, nextQuery: string) {
    const params = new URLSearchParams();
    if (nextStatus !== "all") params.set("status", nextStatus);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    startTransition(() => router.push(params.size > 0 ? `/profil/dilar?${params}#obiavi` : "/profil/dilar#obiavi", { scroll: false }));
  }

  return (
    <form
      action="/profil/dilar"
      method="get"
      role="search"
      aria-label="Филтър на обявите"
      className="flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(status, query);
      }}
    >
      <label htmlFor="dealer-listings-status" className="sr-only">
        Статус
      </label>
      <Select
        id="dealer-listings-status"
        name="status"
        value={status}
        onChange={(event) => navigate(event.target.value, query)}
        className="h-9 w-auto min-w-40 text-sm"
        data-testid="dealer-listings-status"
      >
        {DEALER_LISTING_FILTERS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <div className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
        <label htmlFor="dealer-listings-q" className="sr-only">
          Търси по заглавие
        </label>
        <Input
          id="dealer-listings-q"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Търси по заглавие"
          maxLength={100}
          className="h-9 min-w-0 text-sm"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-9" pending={pending} icon={<Search className="size-4" aria-hidden="true" />}>
          <span className="sr-only sm:not-sr-only">Търси</span>
        </Button>
      </div>
    </form>
  );
}
