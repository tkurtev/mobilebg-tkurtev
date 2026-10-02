"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function CategoryNav({ categories }: { categories: { slug: string; name: string }[] }) {
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? "";
  const items = [...categories.map((category) => ({ href: `/${category.slug}`, label: category.name, key: category.slug })), { href: "/dilari", label: "Дилъри", key: "dilari" }];

  return (
    <nav aria-label="Категории" className="container-page">
      <ul className="scrollbar-none -mx-1.5 flex h-10 items-stretch gap-0.5 overflow-x-auto">
        {items.map((item) => {
          const active = segment === item.key;
          return (
            <li key={item.key} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center border-b-2 px-1.5 text-[13.5px] whitespace-nowrap transition-colors xl:px-2",
                  active ? "border-brand font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
