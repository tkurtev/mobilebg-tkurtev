import { REPORT_REASONS, type StatusTone } from "@/config/listing-status";
import { PROMOTION_PRODUCTS } from "@/config/promotions";

export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export const REPORT_STATUSES: readonly ReportStatus[] = ["OPEN", "RESOLVED", "DISMISSED"];
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = { OPEN: "Отворен", RESOLVED: "Решен", DISMISSED: "Отхвърлен" };
export const REPORT_STATUS_TONES: Record<ReportStatus, StatusTone> = { OPEN: "warning", RESOLVED: "success", DISMISSED: "muted" };

export type ReportReasonValue = (typeof REPORT_REASONS)[number]["value"];
export const REPORT_REASON_VALUES = REPORT_REASONS.map((reason) => reason.value) as readonly ReportReasonValue[];

export function reportReasonLabel(value: string): string {
  return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}

export type UserStatus = "ACTIVE" | "SUSPENDED";
export const USER_STATUSES: readonly UserStatus[] = ["ACTIVE", "SUSPENDED"];
export const USER_STATUS_LABELS: Record<UserStatus, string> = { ACTIVE: "Активен", SUSPENDED: "Спрян" };
export const USER_STATUS_TONES: Record<UserStatus, StatusTone> = { ACTIVE: "success", SUSPENDED: "danger" };

export type DealerStatus = "ACTIVE" | "SUSPENDED";
export const DEALER_STATUSES: readonly DealerStatus[] = ["ACTIVE", "SUSPENDED"];
export const DEALER_STATUS_LABELS: Record<DealerStatus, string> = { ACTIVE: "Активен", SUSPENDED: "Спрян" };
export const DEALER_STATUS_TONES: Record<DealerStatus, StatusTone> = { ACTIVE: "success", SUSPENDED: "danger" };
export const DEALER_MEMBER_ROLE_LABELS: Record<"OWNER" | "MEMBER", string> = { OWNER: "Собственик", MEMBER: "Служител" };

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED";
export const PAYMENT_STATUSES: readonly PaymentStatus[] = ["PENDING", "SUCCEEDED", "FAILED"];
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = { PENDING: "Изчаква", SUCCEEDED: "Успешно", FAILED: "Неуспешно" };
export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = { PENDING: "warning", SUCCEEDED: "success", FAILED: "danger" };

export type PromotionTypeValue = (typeof PROMOTION_PRODUCTS)[number]["type"];
export const PROMOTION_TYPE_VALUES = PROMOTION_PRODUCTS.map((product) => product.type) as readonly PromotionTypeValue[];

export function promotionLabel(type: string): string {
  return PROMOTION_PRODUCTS.find((product) => product.type === type)?.name ?? type;
}

export type SellerType = "private" | "dealer";
export const SELLER_TYPES: readonly SellerType[] = ["private", "dealer"];
export const SELLER_TYPE_LABELS: Record<SellerType, string> = { private: "Частно лице", dealer: "Дилър" };

export const MODERATION_ACTION_LABELS: Record<string, string> = {
  APPROVE: "Одобрена",
  REJECT: "Отказана",
  PAUSE: "Паузирана",
  RESTORE: "Възстановена",
  ARCHIVE: "Архивирана",
  DISMISS_REPORT: "Отхвърлен сигнал",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.role_change": "Смяна на роля",
  "user.suspend": "Спиране на потребител",
  "user.unsuspend": "Възстановяване на потребител",
  "user.delete": "Изтриване на потребител",
  "listing.approve": "Одобрена обява",
  "listing.reject": "Отказана обява",
  "listing.pause": "Паузирана обява",
  "listing.restore": "Възстановена обява",
  "listing.archive": "Архивирана обява",
  "report.dismiss": "Отхвърлен сигнал",
  "report.resolve": "Решен сигнал",
  "dealer.create": "Нов дилър",
  "dealer.update": "Редакция на дилър",
  "dealer.suspend": "Спиране на дилър",
  "dealer.restore": "Възстановяване на дилър",
  "dealer.member_add": "Добавен служител",
  "dealer.member_remove": "Премахнат служител",
  "category.create": "Нова категория",
  "category.update": "Редакция на категория",
  "taxonomy.make_create": "Нова марка",
  "taxonomy.make_update": "Редакция на марка",
  "taxonomy.model_create": "Нов модел",
  "taxonomy.model_update": "Редакция на модел",
  "taxonomy.generation_create": "Ново поколение",
  "taxonomy.generation_update": "Редакция на поколение",
  "taxonomy.generation_delete": "Изтрито поколение",
  "settings.update": "Промяна на настройки",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export const AUDIT_TARGET_LABELS: Record<string, string> = {
  listing: "Обява",
  report: "Сигнал",
  user: "Потребител",
  dealer: "Дилър",
  category: "Категория",
  make: "Марка",
  model: "Модел",
  generation: "Поколение",
  settings: "Настройки",
};

/** Admin page for an audit target, when one exists. */
export function auditTargetHref(targetType: string, targetId: string): string | null {
  switch (targetType) {
    case "listing":
      return `/admin/listings/${targetId}`;
    case "user":
      return `/admin/users/${targetId}`;
    case "dealer":
      return `/admin/dealers/${targetId}`;
    case "make":
      return `/admin/vehicle-data/${targetId}`;
    case "category":
      return "/admin/categories";
    case "settings":
      return "/admin/settings";
    default:
      return null;
  }
}
