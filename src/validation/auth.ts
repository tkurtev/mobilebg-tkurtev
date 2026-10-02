import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Въведи имейл адрес.")
  .max(254, "Имейлът е твърде дълъг.")
  .pipe(z.email("Въведи валиден имейл адрес."));

export const passwordSchema = z
  .string()
  .min(8, "Паролата трябва да е поне 8 символа.")
  .max(128, "Паролата е твърде дълга.")
  .regex(/[A-Za-zА-Яа-я]/, "Паролата трябва да съдържа буква.")
  .regex(/\d/, "Паролата трябва да съдържа цифра.");

export const nameSchema = z.string().trim().min(2, "Въведи име.").max(80, "Името е твърде дълго.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Въведи парола."),
});

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, "Трябва да приемеш условията."),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Паролите не съвпадат." });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Паролите не съвпадат." });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Въведи текущата парола."), newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"], message: "Паролите не съвпадат." });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
