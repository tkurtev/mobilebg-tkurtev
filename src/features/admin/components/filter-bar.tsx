"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/button";

/**
 * GET filter form. With JavaScript it drops empty values before navigating;
 * without it the browser submits the same query string.
 */
export function FilterBar({ action, active, children }: { action: string; active: boolean; children: ReactNode }) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim() !== "") query.set(key, value.trim());
    }
    const serialized = query.toString();
    router.push(serialized ? `${action}?${serialized}` : action);
  }

  return (
    <form method="get" action={action} role="search" onSubmit={onSubmit} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-3">
      {children}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="h-9">
          Филтрирай
        </Button>
        {active ? (
          <Link href={action} className={buttonClasses({ variant: "ghost", size: "sm", className: "h-9" })}>
            Изчисти
          </Link>
        ) : null}
      </div>
    </form>
  );
}
