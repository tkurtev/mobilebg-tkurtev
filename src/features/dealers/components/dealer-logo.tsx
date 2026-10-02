import { cn } from "@/lib/cn";

/** Logo in a neutral square, or the first letter of the name when there is no logo. */
export function DealerLogo({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-subtle text-lg font-semibold text-ink-2",
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-contain" />
      ) : (
        <span aria-hidden="true">{name.trim().slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
