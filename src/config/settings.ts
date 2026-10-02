import { z } from "zod";

export const settingsSchema = z.object({
  listingDurationDays: z.number().int().min(7).max(365),
  moderationMode: z.enum(["post", "pre"]),
  maxImagesPerListing: z.number().int().min(1).max(40),
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
