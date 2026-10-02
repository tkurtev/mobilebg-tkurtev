import { cn } from "@/lib/cn";

export function PromotionLabel({ type, className }: { type: "VIP" | "TOP"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-xs px-1.5 text-[11px] font-bold tracking-wide",
        type === "VIP" ? "bg-promo text-white" : "bg-promo-soft text-promo",
        className,
      )}
      title={type === "VIP" ? "VIP обява" : "TOP обява"}
    >
      {type}
    </span>
  );
}
