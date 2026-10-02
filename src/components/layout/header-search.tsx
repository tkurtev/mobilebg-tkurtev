"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";

export function HeaderSearch({ className, autoFocus = false, onSubmitted }: { className?: string; autoFocus?: boolean; onSubmitted?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/avtomobili?q=${encodeURIComponent(q)}` : "/avtomobili");
    onSubmitted?.();
  }

  return (
    <form role="search" onSubmit={onSubmit} className={cn("relative flex", className)}>
      <label htmlFor="header-search" className="sr-only">
        Търси обяви
      </label>
      <input
        id="header-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Марка, модел или ключова дума"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className="h-10 w-full rounded-md border border-line-strong bg-surface pr-11 pl-3 text-[15px] placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
      />
      <button type="submit" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink" aria-label="Търси">
        <Search className="size-[18px]" aria-hidden="true" />
      </button>
    </form>
  );
}
