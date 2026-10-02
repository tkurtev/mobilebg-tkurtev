export type ListingStatus = "DRAFT" | "PENDING" | "ACTIVE" | "REJECTED" | "PAUSED" | "SOLD" | "EXPIRED" | "ARCHIVED";

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Чернова",
  PENDING: "Изчаква преглед",
  ACTIVE: "Активна",
  REJECTED: "Отказана",
  PAUSED: "Паузирана",
  SOLD: "Продадена",
  EXPIRED: "Изтекла",
  ARCHIVED: "Архивирана",
};

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "muted";

export const LISTING_STATUS_TONES: Record<ListingStatus, StatusTone> = {
  DRAFT: "neutral",
  PENDING: "warning",
  ACTIVE: "success",
  REJECTED: "danger",
  PAUSED: "muted",
  SOLD: "neutral",
  EXPIRED: "muted",
  ARCHIVED: "muted",
};

export const REPORT_REASONS = [
  { value: "FAKE", label: "Фалшива обява" },
  { value: "INCORRECT_INFO", label: "Невярна информация" },
  { value: "DUPLICATE", label: "Дублирана обява" },
  { value: "INAPPROPRIATE", label: "Неподходящо съдържание" },
  { value: "SUSPICIOUS_SELLER", label: "Съмнителен продавач" },
  { value: "SOLD", label: "Автомобилът е продаден" },
  { value: "OTHER", label: "Друго" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
