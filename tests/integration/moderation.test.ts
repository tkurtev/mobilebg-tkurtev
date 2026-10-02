import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import * as s from "@/db/schema";
import { changeStatusAsOwner, createDraft, dismissReport, moderateListing, publishListing, saveListing } from "@/features/listings/service";
import { attachFakeImage, completeCarValues, createReferenceData, createUser, type ReferenceData } from "../support/fixtures";

let ref: ReferenceData;

beforeAll(async () => {
  ref = await createReferenceData();
});

async function activeListing() {
  const seller = await createUser();
  const draft = await createDraft(seller, ref.category.id);
  await saveListing(seller, draft.id, completeCarValues(ref), { step: "review", complete: false });
  await attachFakeImage(draft.id);
  await publishListing(seller, draft.id);
  return { seller, id: draft.id };
}

describe("moderation", () => {
  it("pauses a reported listing with history, audit log and notification", async () => {
    const { seller, id } = await activeListing();
    const moderator = await createUser("MODERATOR");
    const reporter = await createUser();
    const [report] = await db.insert(s.listingReports).values({ listingId: id, reporterId: reporter.id, reason: "FAKE", details: "Фалшиви снимки" }).returning();

    const status = await moderateListing(moderator, { listingId: id, action: "pause", reason: "Проверка на сигнал", reportId: report!.id });
    expect(status).toBe("PAUSED");

    const [listing] = await db.select().from(s.listings).where(eq(s.listings.id, id));
    expect(listing?.moderationLock).toBe(true);
    const actions = await db.select().from(s.moderationActions).where(eq(s.moderationActions.listingId, id));
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ action: "PAUSE", previousStatus: "ACTIVE", newStatus: "PAUSED", moderatorId: moderator.id });
    const audit = await db.select().from(s.auditLogs).where(eq(s.auditLogs.targetId, id));
    expect(audit.map((entry) => entry.action)).toContain("listing.pause");
    const [updatedReport] = await db.select().from(s.listingReports).where(eq(s.listingReports.id, report!.id));
    expect(updatedReport?.status).toBe("RESOLVED");
    const notes = await db.select().from(s.notifications).where(eq(s.notifications.userId, seller.id));
    expect(notes.some((note) => note.type === "LISTING_PAUSED")).toBe(true);

    await expect(changeStatusAsOwner(seller, id, "resume")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await moderateListing(moderator, { listingId: id, action: "restore", reason: "" })).toBe("ACTIVE");
  });

  it("requires a reason to reject and the moderator permission", async () => {
    const { id } = await activeListing();
    const moderator = await createUser("MODERATOR");
    await expect(moderateListing(moderator, { listingId: id, action: "reject", reason: "" })).rejects.toMatchObject({ code: "VALIDATION" });
    const regular = await createUser("DEALER");
    await expect(moderateListing(regular, { listingId: id, action: "pause", reason: "Нарушение" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid transitions", async () => {
    const { id } = await activeListing();
    const moderator = await createUser("MODERATOR");
    await expect(moderateListing(moderator, { listingId: id, action: "approve", reason: "" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("dismisses a report and records the decision", async () => {
    const { id } = await activeListing();
    const moderator = await createUser("MODERATOR");
    const reporter = await createUser();
    const [report] = await db.insert(s.listingReports).values({ listingId: id, reporterId: reporter.id, reason: "OTHER", details: "Не отговаря" }).returning();
    await dismissReport(moderator, report!.id, "Няма нарушение");
    const [updated] = await db.select().from(s.listingReports).where(eq(s.listingReports.id, report!.id));
    expect(updated?.status).toBe("DISMISSED");
    await expect(dismissReport(moderator, report!.id, "")).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
