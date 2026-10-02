import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/cn";

type PriceProps = {
  priceCents: number | null;
  previousPriceCents?: number | null;
  negotiable?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = { sm: "text-base", md: "text-lg", lg: "text-[28px] leading-tight" };

export function Price({ priceCents, previousPriceCents, negotiable, size = "md", className }: PriceProps) {
  if (priceCents === null) {
    return <span className={cn("font-semibold text-ink", SIZES[size], className)}>По договаряне</span>;
  }
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-semibold whitespace-nowrap text-ink tabular", SIZES[size])}>{formatPrice(priceCents)}</span>
      {previousPriceCents && previousPriceCents > priceCents ? (
        <s className="text-sm whitespace-nowrap text-muted tabular" aria-label={`Предишна цена ${formatPrice(previousPriceCents)}`}>
          {formatPrice(previousPriceCents)}
        </s>
      ) : null}
      {negotiable ? <span className="text-sm text-muted">Договаряне</span> : null}
    </span>
  );
}
