import { z } from "zod";
import { ATTRIBUTE_SET_KEYS, type AttributeSetKey } from "@/config/attribute-sets";
import { VEHICLE_TYPES, type VehicleType } from "@/config/categories";
import { normalizeBgPhone } from "@/lib/phone";
import { ROLES, type Role } from "@/server/auth/policies";
import { MODERATION_ACTIONS, type AdminModerationAction } from "./moderation";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const VEHICLE_TYPE_VALUES = VEHICLE_TYPES.map((type) => type.value) as [VehicleType, ...VehicleType[]];
const MAX_YEAR = new Date().getFullYear() + 2;

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Въведи адрес (slug).")
  .max(80, "Адресът е твърде дълъг.")
  .regex(SLUG_PATTERN, "Само малки латински букви, цифри и тире.")
  .refine((value) => !value.startsWith("-") && !value.endsWith("-"), "Адресът не може да започва или завършва с тире.");

const optionalSlugSchema = z.union([z.literal(""), slugSchema]);
const optionalUuid = z.union([z.literal(""), z.uuid()]);

export const moderationInputSchema = z.object({
  listingId: z.uuid(),
  action: z.enum(MODERATION_ACTIONS as [AdminModerationAction, ...AdminModerationAction[]]),
  reason: z.string().max(500, "Причината е твърде дълга."),
  reportId: z.uuid().nullish(),
});

export const dismissReportSchema = z.object({
  reportId: z.uuid(),
  note: z.string().max(500, "Бележката е твърде дълга."),
});

export const roleChangeSchema = z.object({
  userId: z.uuid(),
  role: z.enum(ROLES as [Role, ...Role[]], "Избери роля."),
});

export const suspendUserSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(3, "Посочи причина.").max(300, "Причината е твърде дълга."),
});

export const dealerUpdateSchema = z
  .object({
    dealerId: z.uuid(),
    name: z.string().trim().min(2, "Въведи име.").max(120, "Името е твърде дълго."),
    phone: z
      .string()
      .trim()
      .refine((value) => normalizeBgPhone(value) !== null, "Въведи валиден български телефон."),
    email: z.union([z.literal(""), z.string().trim().max(254, "Имейлът е твърде дълъг.").pipe(z.email("Въведи валиден имейл."))]),
    website: z.union([z.literal(""), z.string().trim().max(200, "Адресът е твърде дълъг.").pipe(z.url({ protocol: /^https?$/, error: "Въведи адрес, започващ с https://." }))]),
    address: z.string().trim().max(200, "Адресът е твърде дълъг."),
    description: z.string().max(3000, "Описанието е твърде дълго."),
    regionId: optionalUuid,
    cityId: optionalUuid,
  })
  .refine((data) => !data.cityId || data.regionId, { path: ["regionId"], message: "Избери област." });

export type DealerUpdateInput = z.infer<typeof dealerUpdateSchema>;

export const dealerStatusSchema = z.object({ dealerId: z.uuid(), status: z.enum(["ACTIVE", "SUSPENDED"]) });

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Въведи име.").max(60, "Името е твърде дълго."),
  slug: slugSchema,
  sortOrder: z.number("Въведи число.").int("Въведи цяло число.").min(0, "Минимум 0.").max(10_000, "Максимум 10000."),
  isActive: z.boolean(),
  attributeSet: z.enum(ATTRIBUTE_SET_KEYS as [AttributeSetKey, ...AttributeSetKey[]], "Избери набор от характеристики."),
  vehicleType: z.union([z.literal(""), z.enum(VEHICLE_TYPE_VALUES)]),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema.extend({ id: z.uuid() });

export const makeCreateSchema = z.object({
  name: z.string().trim().min(1, "Въведи име.").max(60, "Името е твърде дълго."),
  slug: optionalSlugSchema,
});

export const makeUpdateSchema = makeCreateSchema.extend({ id: z.uuid(), slug: slugSchema });

export const toggleActiveSchema = z.object({ id: z.uuid(), isActive: z.boolean() });

export const modelCreateSchema = z.object({
  makeId: z.uuid(),
  name: z.string().trim().min(1, "Въведи име.").max(60, "Името е твърде дълго."),
  slug: optionalSlugSchema,
  vehicleType: z.enum(VEHICLE_TYPE_VALUES, "Избери вид превозно средство."),
});

export const modelUpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Въведи име.").max(60, "Името е твърде дълго."),
  slug: slugSchema,
});

const yearSchema = z.number("Въведи година.").int("Въведи година.").min(1900, "Минимум 1900.").max(MAX_YEAR, `Максимум ${MAX_YEAR}.`);

export const generationInputSchema = z
  .object({
    name: z.string().trim().min(1, "Въведи име.").max(60, "Името е твърде дълго."),
    yearFrom: yearSchema,
    yearTo: yearSchema.nullable(),
  })
  .refine((data) => data.yearTo === null || data.yearTo >= data.yearFrom, { path: ["yearTo"], message: "Годината до трябва да е след годината от." });

export const generationCreateSchema = z.object({ modelId: z.uuid(), values: generationInputSchema });
export const generationUpdateSchema = z.object({ id: z.uuid(), values: generationInputSchema });

export { settingsSchema as settingsFormSchema } from "@/config/settings";
