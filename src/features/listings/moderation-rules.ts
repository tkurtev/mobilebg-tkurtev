import type { ListingStatus } from "@/config/listing-status";

export type ModerationAction = "approve" | "reject" | "pause" | "restore" | "archive";

/** Allowed moderator transitions. Used by the service (enforcement) and the admin UI (which buttons to show). */
export const MODERATION_TARGET: Record<ModerationAction, { from: readonly ListingStatus[]; to: ListingStatus }> = {
  approve: { from: ["PENDING"], to: "ACTIVE" },
  reject: { from: ["PENDING", "ACTIVE", "PAUSED"], to: "REJECTED" },
  pause: { from: ["ACTIVE"], to: "PAUSED" },
  restore: { from: ["PAUSED", "REJECTED", "ARCHIVED", "EXPIRED"], to: "ACTIVE" },
  archive: { from: ["DRAFT", "PENDING", "ACTIVE", "REJECTED", "PAUSED", "SOLD", "EXPIRED"], to: "ARCHIVED" },
};
