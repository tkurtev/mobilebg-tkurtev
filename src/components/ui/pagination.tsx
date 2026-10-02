import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type PaginationProps = { page: number; totalPages: number; hrefForPage: (page: number) => string };

function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((p, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && p - previous > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

const ITEM = "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-[15px] tabular";

export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Страници" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={cn(ITEM, "border-line-strong bg-surface hover:bg-subtle")} rel="prev">
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Предишна</span>
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefForPage(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              ITEM,
              item === page ? "border-brand bg-brand text-white" : "border-line-strong bg-surface hover:bg-subtle",
              Math.abs(item - page) > 1 && item !== 1 && item !== totalPages && "hidden sm:inline-flex",
            )}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={cn(ITEM, "border-line-strong bg-surface hover:bg-subtle")} rel="next">
          <span className="sr-only sm:not-sr-only sm:mr-1">Следваща</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}
