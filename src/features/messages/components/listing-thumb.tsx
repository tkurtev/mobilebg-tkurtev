import Image from "next/image";
import { cn } from "@/lib/cn";

/** Small decorative cover image; the listing title is always rendered next to it. */
export function ListingThumb({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={cn("relative aspect-[4/3] shrink-0 overflow-hidden rounded-sm bg-subtle", className)}>
      {src ? <Image src={src} alt="" fill unoptimized sizes="64px" className="object-cover" /> : null}
    </div>
  );
}
