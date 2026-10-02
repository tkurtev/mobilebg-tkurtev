import Link from "next/link";
import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[22px] leading-none font-bold tracking-[-0.02em] text-ink", className)}>
      Mobi<span className="text-brand">Ted</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center rounded-sm", className)} aria-label="MobiTed - начало">
      <Wordmark />
    </Link>
  );
}
