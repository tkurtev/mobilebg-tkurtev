"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type AccountNavItem = { href: string; label: string; badge?: number; match?: "exact" | "prefix" };

export function AccountNav({ items }: { items: AccountNavItem[] }) {
  const pathname = usePathname();
  const isActive = (item: AccountNavItem) => (item.match === "exact" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <nav aria-label="Профил">
      <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-0">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center justify-between gap-3 rounded-md px-3 text-sm whitespace-nowrap transition-colors lg:h-10 lg:text-[15px]",
                  active ? "bg-brand-soft font-medium text-brand-ink" : "text-ink-2 hover:bg-subtle hover:text-ink",
                  "max-lg:border max-lg:border-line max-lg:bg-surface",
                  active && "max-lg:border-brand/40 max-lg:bg-brand-soft",
                )}
              >
                {item.label}
                {item.badge ? <span className="min-w-5 rounded-full bg-danger px-1.5 text-center text-xs leading-5 font-semibold text-white tabular">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
