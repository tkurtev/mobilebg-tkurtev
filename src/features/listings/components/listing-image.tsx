import { Camera } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";

type ListingImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  count?: number;
  sizes?: string;
};

/** Uploaded images are already resized server-side, so Next.js optimization is skipped. */
export function ListingImage({ src, alt, className, priority, count, sizes = "(max-width: 640px) 40vw, 240px" }: ListingImageProps) {
  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden bg-subtle", className)}>
      {src ? (
        <Image src={src} alt={alt} fill unoptimized sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted">
          <Camera className="size-7" aria-hidden="true" />
          <span className="sr-only">Няма снимка</span>
        </div>
      )}
      {count && count > 1 ? (
        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-ink/70 px-1.5 py-0.5 text-xs text-white tabular">
          <Camera className="size-3" aria-hidden="true" />
          {count}
        </span>
      ) : null}
    </div>
  );
}
