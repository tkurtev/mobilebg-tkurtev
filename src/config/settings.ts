import { z } from "zod";

export const settingsSchema = z.object({
  listingDurationDays: z.number("Въведи число.").int("Въведи цяло число.").min(7, "Минимум 7 дни.").max(365, "Максимум 365 дни."),
  moderationMode: z.enum(["post", "pre"], "Избери режим."),
  maxImagesPerListing: z.number("Въведи число.").int("Въведи цяло число.").min(1, "Минимум 1 снимка.").max(40, "Максимум 40 снимки."),
});

export type AppSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  listingDurationDays: 60,
  moderationMode: "post",
  maxImagesPerListing: 20,
};

export const MODERATION_MODE_LABELS: Record<AppSettings["moderationMode"], string> = {
  post: "Публикуване веднага, преглед при сигнал",
  pre: "Преглед преди публикуване",
};
