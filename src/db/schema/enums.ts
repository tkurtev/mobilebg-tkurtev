import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "DEALER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);

export const listingStatusEnum = pgEnum("listing_status", [
  "DRAFT",
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "PAUSED",
  "SOLD",
  "EXPIRED",
  "ARCHIVED",
]);

export const dealerStatusEnum = pgEnum("dealer_status", ["ACTIVE", "SUSPENDED"]);
export const dealerMemberRoleEnum = pgEnum("dealer_member_role", ["OWNER", "MEMBER"]);

export const promotionTypeEnum = pgEnum("promotion_type", ["TOP", "VIP", "HIGHLIGHT", "REFRESH"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "SUCCEEDED", "FAILED"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["DEMO"]);

export const reportReasonEnum = pgEnum("report_reason", [
  "FAKE",
  "INCORRECT_INFO",
  "DUPLICATE",
  "INAPPROPRIATE",
  "SUSPICIOUS_SELLER",
  "SOLD",
  "OTHER",
]);
export const reportStatusEnum = pgEnum("report_status", ["OPEN", "RESOLVED", "DISMISSED"]);

export const moderationActionTypeEnum = pgEnum("moderation_action_type", [
  "APPROVE",
  "REJECT",
  "PAUSE",
  "RESTORE",
  "ARCHIVE",
  "DISMISS_REPORT",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "MESSAGE_RECEIVED",
  "LISTING_APPROVED",
  "LISTING_REJECTED",
  "LISTING_PAUSED",
  "LISTING_RESTORED",
  "LISTING_EXPIRED",
  "PROMOTION_ACTIVATED",
  "SAVED_SEARCH_MATCH",
]);
