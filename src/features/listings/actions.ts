"use server";

import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser, type CurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { LISTING_STEPS, listingValuesSchema, type StepKey } from "./editor";
import {
  changeDraftCategory,
  changeStatusAsOwner,
  createDraft,
  deleteListingImage,
  publishListing,
  reorderListingImages,
  saveListing,
  type OwnerAction,
} from "./service";

const stepSchema = z.enum(LISTING_STEPS.map((step) => step.key) as [StepKey, ...StepKey[]]);

async function requireVerifiedSeller(): Promise<CurrentUser> {
  const user = await requireActionUser();
  if (!user.emailVerified) throw new AppError("FORBIDDEN", "Потвърди имейла си, за да публикуваш обяви.");
  return user;
}

function refreshListingPages() {
  revalidatePath("/profil/obiavi");
  revalidatePath("/profil");
  updateTag("listings:aggregates");
}

export async function createDraftAction(input: { categoryId: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireVerifiedSeller();
    const data = parseInput(z.object({ categoryId: z.uuid() }), input);
    const draft = await createDraft(user, data.categoryId);
    revalidatePath("/profil/obiavi");
    return draft;
  });
}

export async function changeDraftCategoryAction(input: { listingId: string; categoryId: string }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireVerifiedSeller();
    const data = parseInput(z.object({ listingId: z.uuid(), categoryId: z.uuid() }), input);
    await changeDraftCategory(user, data.listingId, data.categoryId);
  });
}

export async function saveListingAction(input: {
  listingId: string;
  step: StepKey;
  complete: boolean;
  values: unknown;
}): Promise<ActionResult<{ savedAt: string; path: string }>> {
  return runAction(async () => {
    const user = await requireVerifiedSeller();
    const data = parseInput(z.object({ listingId: z.uuid(), step: stepSchema, complete: z.boolean(), values: listingValuesSchema }), input);
    const result = await saveListing(user, data.listingId, data.values, { step: data.step, complete: data.complete });
    revalidatePath(result.slugPath);
    return { savedAt: new Date().toISOString(), path: result.slugPath };
  });
}

export async function publishListingAction(listingId: string): Promise<ActionResult<{ status: string; path: string }>> {
  return runAction(async () => {
    const user = await requireVerifiedSeller();
    const result = await publishListing(user, parseInput(z.uuid(), listingId));
    refreshListingPages();
    return result;
  });
}

const ownerActionSchema = z.enum(["pause", "resume", "sold", "archive", "renew"] satisfies OwnerAction[]);

export async function ownerStatusAction(input: { listingId: string; action: OwnerAction }): Promise<ActionResult<{ status: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(z.object({ listingId: z.uuid(), action: ownerActionSchema }), input);
    const status = await changeStatusAsOwner(user, data.listingId, data.action);
    refreshListingPages();
    return { status };
  });
}

export async function deleteImageAction(imageId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await deleteListingImage(user, parseInput(z.uuid(), imageId));
  });
}

export async function reorderImagesAction(input: { listingId: string; imageIds: string[] }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(z.object({ listingId: z.uuid(), imageIds: z.array(z.uuid()).max(60) }), input);
    await reorderListingImages(user, data.listingId, data.imageIds);
  });
}
