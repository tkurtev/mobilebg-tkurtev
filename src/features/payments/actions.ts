"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { PROMOTION_TYPES } from "@/features/promotions/catalog";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";
import { purchasePromotion } from "./service";
import type { CheckoutInput, CheckoutResult } from "./types";

// Strict: card fields or a client-side amount are rejected instead of silently ignored.
const checkoutSchema = z.strictObject({
  listingId: z.uuid(),
  promotionType: z.enum(PROMOTION_TYPES),
});

export async function checkoutAction(input: CheckoutInput): Promise<ActionResult<CheckoutResult>> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(checkoutSchema, input);
    const result = await purchasePromotion(user, data);
    revalidatePath(result.listingPath);
    revalidatePath("/profil/obiavi");
    revalidatePath("/profil/plashtaniya");
    updateTag("listings:aggregates");
    return result;
  });
}
