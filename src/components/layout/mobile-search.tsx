"use client";

import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { HeaderSearch } from "./header-search";

export function MobileSearch() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex size-10 items-center justify-center rounded-md text-ink-2 hover:bg-subtle md:hidden" aria-label="Търсене">
        <Search className="size-5" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent title="Търсене" className="top-4 translate-y-0">
        <HeaderSearch autoFocus onSubmitted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
