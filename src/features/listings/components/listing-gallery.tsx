"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Camera, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { cn } from "@/lib/cn";

export type GalleryImage = { id: string; url: string; thumbUrl: string; width: number; height: number };

function useSwipe(onSwipe: (direction: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) start.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchEnd: (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!start.current || !touch) return;
      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) onSwipe(dx < 0 ? 1 : -1);
    },
  };
}

const NAV_BUTTON =
  "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm hover:bg-surface focus-visible:outline-2";

export function ListingGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const count = images.length;
  const current = images[index];
  const go = (delta: number) => setIndex((value) => (value + delta + count) % count);
  const swipe = useSwipe((direction) => go(direction));
  const thumbStrip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (count < 2) return;
    const next = images[(index + 1) % count];
    if (next) {
      const preload = new window.Image();
      preload.src = next.url;
    }
    thumbStrip.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index, images, count]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  };

  if (!current) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-line bg-subtle text-muted">
        <Camera className="mr-2 size-6" aria-hidden="true" />
        Няма снимки
      </div>
    );
  }

  return (
    <section aria-label="Снимки" aria-roledescription="галерия" onKeyDown={onKeyDown}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink select-none" {...swipe}>
        <button type="button" className="absolute inset-0 cursor-zoom-in" onClick={() => setFullscreen(true)} aria-label="Отвори на цял екран">
          <Image src={current.url} alt={`${title}, снимка ${index + 1} от ${count}`} fill unoptimized priority={index === 0} sizes="(max-width: 1024px) 100vw, 800px" className="object-contain" />
        </button>
        {count > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} className={cn(NAV_BUTTON, "left-3")} aria-label="Предишна снимка">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} className={cn(NAV_BUTTON, "right-3")} aria-label="Следваща снимка">
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-sm bg-ink/75 px-2 py-0.5 text-sm text-white tabular" aria-live="polite">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-md bg-ink/75 text-white hover:bg-ink"
          aria-label="Цял екран"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {count > 1 ? (
        <div ref={thumbStrip} className="scrollbar-none mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, imageIndex) => (
            <button
              key={image.id}
              type="button"
              data-index={imageIndex}
              onClick={() => setIndex(imageIndex)}
              aria-label={`Снимка ${imageIndex + 1}`}
              aria-current={imageIndex === index}
              className={cn(
                "relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-md border-2 sm:w-24",
                imageIndex === index ? "border-brand" : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              <Image src={image.thumbUrl} alt="" fill unoptimized loading="lazy" sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <DialogPrimitive.Root open={fullscreen} onOpenChange={setFullscreen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-black text-white focus:outline-none" onKeyDown={onKeyDown}>
            <div className="flex items-center justify-between px-4 py-3">
              <DialogPrimitive.Title className="truncate pr-4 text-sm text-white/80">
                {title}
                <span className="ml-2 tabular">
                  {index + 1} / {count}
                </span>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Разглеждане на снимките в цял екран. Използвай стрелките за навигация.</DialogPrimitive.Description>
              <DialogPrimitive.Close className="flex size-10 items-center justify-center rounded-md hover:bg-white/10" aria-label="Затвори">
                <X className="size-6" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>
            <div className="relative min-h-0 flex-1" {...swipe}>
              <Image src={current.url} alt={`${title}, снимка ${index + 1} от ${count}`} fill unoptimized sizes="100vw" className="object-contain" />
              {count > 1 ? (
                <>
                  <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Предишна снимка">
                    <ChevronLeft className="size-6" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Следваща снимка">
                    <ChevronRight className="size-6" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
            {count > 1 ? (
              <div className="scrollbar-none flex justify-center gap-2 overflow-x-auto px-4 py-3">
                {images.map((image, imageIndex) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setIndex(imageIndex)}
                    aria-label={`Снимка ${imageIndex + 1}`}
                    aria-current={imageIndex === index}
                    className={cn("relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-sm border-2", imageIndex === index ? "border-white" : "border-transparent opacity-60")}
                  >
                    <Image src={image.thumbUrl} alt="" fill unoptimized loading="lazy" sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </section>
  );
}
