"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { toggleFavorite } from "../actions";
import { localFavorites } from "../local-store";

type FavoriteButtonProps = {
  listingId: string;
  authenticated: boolean;
  initialFavorited?: boolean;
  className?: string;
  withLabel?: boolean;
};

export function FavoriteButton({ listingId, authenticated, initialFavorited = false, className, withLabel = false }: FavoriteButtonProps) {
  const localIds = localFavorites.useIds();
  const [serverState, setServerState] = useState(initialFavorited);
  const [, startTransition] = useTransition();
  const favorited = authenticated ? serverState : localIds.includes(listingId);
  const label = favorited ? "Премахни от любими" : "Добави в любими";

  function onClick() {
    if (!authenticated) {
      localFavorites.toggle(listingId);
      return;
    }
    const next = !serverState;
    setServerState(next);
    startTransition(async () => {
      const result = await toggleFavorite(listingId);
      if (!result.ok) setServerState(!next);
      else setServerState(result.data.favorited);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorited}
      aria-label={withLabel ? undefined : label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md transition-colors",
        withLabel ? "h-10 border border-line-strong bg-surface px-3 text-[15px] text-ink hover:bg-subtle" : "size-9 text-muted hover:bg-subtle hover:text-ink",
        favorited && !withLabel && "text-danger hover:text-danger",
        className,
      )}
    >
      <Heart className={cn("size-5", favorited && "fill-danger text-danger")} aria-hidden="true" />
      {withLabel ? <span>{favorited ? "В любими" : "Добави в любими"}</span> : null}
    </button>
  );
}
