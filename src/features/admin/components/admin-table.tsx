import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

/** Dense data table. On narrow screens it scrolls horizontally inside its bordered container. */
export function AdminTable({ caption, children, className, minWidth = 720 }: { caption: string; children: ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-line bg-surface", className)}>
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-subtle text-left text-ink-2">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("px-3 py-2 font-medium whitespace-nowrap", className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-line last:border-0", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 align-top", className)} {...props} />;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-muted">
        {children}
      </td>
    </tr>
  );
}

/** Key and value pairs for detail views and audit metadata. */
export function DetailList({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm", className)}>
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted">{item.label}</dt>
          <dd className="min-w-0 break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ResultCount({ total, noun }: { total: number; noun: [string, string] }) {
  return (
    <p className="mb-2 text-sm text-muted" aria-live="polite">
      {formatCount(total, noun[0], noun[1])}
    </p>
  );
}

export function SectionHeading({ children, actions, id }: { children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-lg font-semibold">
        {children}
      </h2>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
