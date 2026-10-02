import { z } from "zod";
import { normalizeBgPhone } from "@/lib/phone";
import { sanitizePlainText, sanitizeSingleLine } from "@/lib/text";
import { emailSchema } from "@/validation/auth";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export const dealerProfileSchema = z.object({
  name: z
    .string()
    .max(120, "Името е до 120 символа.")
    .transform((value) => sanitizeSingleLine(value, 120))
    .pipe(z.string().min(2, "Въведи името на фирмата.")),
  phone: z
    .string()
    .trim()
    .min(1, "Въведи телефон.")
    .max(30, "Въведи валиден телефон.")
    .transform((value, ctx) => {
      const phone = normalizeBgPhone(value);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "Въведи валиден български телефон." });
        return z.NEVER;
      }
      return phone;
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Имейлът е твърде дълъг.")
    .refine((value) => value === "" || z.email().safeParse(value).success, "Въведи валиден имейл адрес.")
    .transform((value) => value || null),
  website: z
    .string()
    .trim()
    .max(200, "Адресът е твърде дълъг.")
    .refine((value) => value === "" || isHttpUrl(value), "Въведи адрес, който започва с http:// или https://.")
    .transform((value) => value || null),
  regionId: z.string().min(1, "Избери област.").pipe(z.uuid("Избери област.")),
  cityId: z.string().min(1, "Избери град.").pipe(z.uuid("Избери град.")),
  address: z
    .string()
    .max(200, "Адресът е до 200 символа.")
    .transform((value) => sanitizeSingleLine(value, 200))
    .pipe(z.string().min(3, "Въведи адрес.")),
  description: z
    .string()
    .max(4000, "Описанието е до 4000 символа.")
    .transform((value) => sanitizePlainText(value, 4000)),
});

export type DealerProfileInput = z.input<typeof dealerProfileSchema>;
export type DealerProfileData = z.output<typeof dealerProfileSchema>;

const openingDaySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  isClosed: z.boolean(),
  opensAt: z.string().max(8),
  closesAt: z.string().max(8),
});

export const openingHoursSchema = z
  .object({ days: z.array(openingDaySchema).length(7) })
  .superRefine((value, ctx) => {
    const days = new Set(value.days.map((day) => day.dayOfWeek));
    if (days.size !== 7) ctx.addIssue({ code: "custom", path: ["days"], message: "Попълни всички дни от седмицата." });
    value.days.forEach((day, index) => {
      if (day.isClosed) return;
      const opensValid = TIME_PATTERN.test(day.opensAt);
      const closesValid = TIME_PATTERN.test(day.closesAt);
      if (!opensValid) ctx.addIssue({ code: "custom", path: ["days", index, "opensAt"], message: "Въведи начален час." });
      if (!closesValid) ctx.addIssue({ code: "custom", path: ["days", index, "closesAt"], message: "Въведи краен час." });
      if (opensValid && closesValid && day.closesAt <= day.opensAt) {
        ctx.addIssue({ code: "custom", path: ["days", index, "closesAt"], message: "Краят трябва да е след началото." });
      }
    });
  });

export type OpeningHoursInput = z.input<typeof openingHoursSchema>;

export const addMemberSchema = z.object({ email: emailSchema });

export const removeMemberSchema = z.object({ userId: z.uuid() });
