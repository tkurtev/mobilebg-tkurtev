"use server";

import { z } from "zod";
import { mergeLocalFavorites } from "@/features/favorites/actions";
import { mergeRecentlyViewed } from "@/features/recently-viewed/service";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";

/** Moves favorites and recently viewed listings collected while logged out into the account. */
export async function mergeAnonymousData(input: { favoriteIds: string[]; recentIds: string[] }): Promise<ActionResult<{ favorites: number }>> {
  return runAction(async () => {
    const data = parseInput(z.object({ favoriteIds: z.array(z.uuid()).max(200), recentIds: z.array(z.uuid()).max(30) }), input);
    const user = await requireActionUser();
    const favorites = await mergeLocalFavorites(data.favoriteIds);
    await mergeRecentlyViewed(user.id, data.recentIds);
    return { favorites: favorites.ok ? favorites.data.merged : 0 };
  });
}
