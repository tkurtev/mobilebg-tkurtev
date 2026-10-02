"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SearchFilterPanel, type SearchFiltersProps } from "./search-filters";

export function MobileFilters({ activeCount, ...props }: Omit<SearchFiltersProps, "mode" | "idPrefix" | "onApplied"> & { activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-subtle lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Филтри
        {activeCount > 0 ? <span className="min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 text-white tabular">{activeCount}</span> : null}
      </DialogTrigger>
      <DialogContent title="Филтри" variant="sheet" side="left" className="max-w-full sm:max-w-md">
        <SearchFilterPanel {...props} mode="deferred" idPrefix="m" onApplied={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
