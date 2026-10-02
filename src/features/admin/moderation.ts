import type { ListingStatus } from "@/config/listing-status";
import { MODERATION_TARGET } from "@/features/listings/moderation-rules";

export type AdminModerationAction = "approve" | "reject" | "pause" | "restore" | "archive";

export const MODERATION_ACTIONS: readonly AdminModerationAction[] = ["approve", "restore", "pause", "reject", "archive"];

export function availableModerationActions(status: ListingStatus): AdminModerationAction[] {
  return MODERATION_ACTIONS.filter((action) => MODERATION_TARGET[action].from.includes(status));
}

export function canApplyModeration(action: AdminModerationAction, status: ListingStatus): boolean {
  return MODERATION_TARGET[action].from.includes(status);
}

export const REASON_REQUIRED: Record<AdminModerationAction, boolean> = {
  approve: false,
  reject: true,
  pause: true,
  restore: false,
  archive: false,
};

export const MODERATION_COPY: Record<AdminModerationAction, { button: string; title: string; description: string; submit: string; tone: "primary" | "danger" }> = {
  approve: {
    button: "Одобри",
    title: "Одобряване на обявата",
    description: "Обявата става активна и продавачът получава известие.",
    submit: "Одобри",
    tone: "primary",
  },
  restore: {
    button: "Възстанови",
    title: "Възстановяване на обявата",
    description: "Обявата става активна отново и продавачът получава известие.",
    submit: "Възстанови",
    tone: "primary",
  },
  pause: {
    button: "Паузирай",
    title: "Паузиране на обявата",
    description: "Обявата се скрива от търсенето. Продавачът не може да я активира сам.",
    submit: "Паузирай",
    tone: "danger",
  },
  reject: {
    button: "Откажи",
    title: "Отказване на обявата",
    description: "Обявата се скрива и продавачът вижда причината. Може да я редактира и изпрати за преглед отново.",
    submit: "Откажи",
    tone: "danger",
  },
  archive: {
    button: "Архивирай",
    title: "Архивиране на обявата",
    description: "Обявата се архивира и промоциите ѝ се прекратяват. Действието може да бъде отменено с възстановяване.",
    submit: "Архивирай",
    tone: "danger",
  },
};
