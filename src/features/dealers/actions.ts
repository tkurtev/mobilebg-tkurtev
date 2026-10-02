"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { deleteStoredFiles } from "@/server/storage";
import { addMemberSchema, dealerProfileSchema, openingHoursSchema, removeMemberSchema, type DealerProfileInput, type OpeningHoursInput } from "./schemas";
import { enforceRateLimit } from "@/server/rate-limit";
import { addDealerMember, createDealer, removeDealerMember, setDealerLogo, updateDealerProfile, updateOpeningHours } from "./service";

function revalidateDealer(slug: string): void {
  revalidatePath("/dilari");
  revalidatePath(`/dilari/${slug}`);
  revalidatePath("/profil/dilar", "layout");
  updateTag("dealers");
}

async function requireDealerUser() {
  const user = await requireActionUser();
  if (!user.dealer) throw new AppError("FORBIDDEN", "Профилът ти не е свързан с дилър.");
  return { user, dealer: user.dealer };
}

export async function createDealerAction(input: DealerProfileInput): Promise<ActionResult> {
  const result = await runAction(async () => {
    const user = await requireActionUser();
    if (user.dealer) throw new AppError("CONFLICT", "Профилът ти вече е свързан с дилър.");
    const data = parseInput(dealerProfileSchema, input);
    const dealer = await createDealer(user, data);
    revalidateDealer(dealer.slug);
  });
  if (result.ok) redirect("/profil/dilar");
  return result;
}

export async function updateDealerProfileAction(input: DealerProfileInput): Promise<ActionResult> {
  return runAction(async () => {
    const { user, dealer } = await requireDealerUser();
    const data = parseInput(dealerProfileSchema, input);
    const { slug } = await updateDealerProfile(user, dealer.id, data);
    revalidateDealer(slug);
  });
}

export async function updateOpeningHoursAction(input: OpeningHoursInput): Promise<ActionResult> {
  return runAction(async () => {
    const { user, dealer } = await requireDealerUser();
    const data = parseInput(openingHoursSchema, input);
    await updateOpeningHours(user, dealer.id, data);
    revalidateDealer(dealer.slug);
  });
}

export async function addDealerMemberAction(input: { email: string }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, dealer } = await requireDealerUser();
    const data = parseInput(addMemberSchema, input);
    await enforceRateLimit("dealerMemberAdd", user.id);
    await addDealerMember(user, dealer.id, data.email);
    revalidatePath("/profil/dilar/nastroiki");
  });
}

export async function removeDealerMemberAction(input: { userId: string }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, dealer } = await requireDealerUser();
    const data = parseInput(removeMemberSchema, input);
    await removeDealerMember(user, dealer.id, data.userId);
    revalidatePath("/profil/dilar/nastroiki");
  });
}

export async function removeDealerLogoAction(): Promise<ActionResult> {
  return runAction(async () => {
    const { user, dealer } = await requireDealerUser();
    const { slug, previousPath } = await setDealerLogo(user, dealer.id, null);
    await deleteStoredFiles([previousPath]);
    revalidateDealer(slug);
  });
}
