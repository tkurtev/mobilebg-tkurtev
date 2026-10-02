import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Навигация" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? <ChevronRight className="size-3.5 text-line-strong" aria-hidden="true" /> : null}
            <li>
              {item.href && index < items.length - 1 ? (
                <Link href={item.href} className="hover:text-ink hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={index === items.length - 1 ? "page" : undefined} className="text-ink-2">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
