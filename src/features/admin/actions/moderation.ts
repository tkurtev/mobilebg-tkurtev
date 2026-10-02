"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { z } from "zod";
import type { ListingStatus } from "@/config/listing-status";
import { dismissReport, moderateListing } from "@/features/listings/service";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { can } from "@/server/auth/policies";
import { requireActionPermission } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { dismissReportSchema, moderationInputSchema } from "../schemas";

export async function moderateListingAction(input: z.input<typeof moderationInputSchema>): Promise<ActionResult<{ status: ListingStatus }>> {
  return runAction(async () => {
    const actor = await requireActionPermission("listings.moderate");
    const data = parseInput(moderationInputSchema, input);
    if (data.reportId && !can(actor, "reports.manage")) throw new AppError("FORBIDDEN");
    const status = await moderateListing(actor, {
      listingId: data.listingId,
      action: data.action,
      reason: data.reason,
      reportId: data.reportId ?? null,
    });
    updateTag("listings:aggregates");
    revalidatePath("/admin", "layout");
    return { status };
  });
}

export async function dismissReportAction(input: z.input<typeof dismissReportSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("reports.manage");
    const data = parseInput(dismissReportSchema, input);
    await dismissReport(actor, data.reportId, data.note);
    revalidatePath("/admin", "layout");
  });
}
