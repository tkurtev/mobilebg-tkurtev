import { z } from "zod";
import { normalizeBgPhone } from "@/lib/phone";
import { nameSchema } from "@/validation/auth";

export const profileSchema = z.object({
  name: nameSchema,
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value === "" || normalizeBgPhone(value) !== null, "Въведи български телефонен номер, например 0888123456."),
  regionId: z.uuid().nullable(),
  cityId: z.uuid().nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
