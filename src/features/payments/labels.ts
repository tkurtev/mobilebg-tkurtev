import type { StatusTone } from "@/config/listing-status";
import type { PaymentProviderName, PaymentStatus } from "./provider";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  SUCCEEDED: "Успешно",
  FAILED: "Неуспешно",
  PENDING: "В изчакване",
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  SUCCEEDED: "success",
  FAILED: "danger",
  PENDING: "warning",
};

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderName, string> = {
  DEMO: "Демо",
};

/** "3f2a9c1e-..." -> "3F2A9C1E". Enough to find a payment without printing the full UUID. */
export function shortReference(reference: string | null): string {
  if (!reference) return "-";
  return reference.replace(/-/g, "").slice(0, 8).toUpperCase();
}
