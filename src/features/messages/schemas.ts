import { z } from "zod";
import { sanitizePlainText } from "@/lib/text";

export const messageBodySchema = z
  .string()
  .transform((value) => sanitizePlainText(value, 2000))
  .pipe(z.string().min(2, "Съобщението е твърде кратко.").max(2000, "Съобщението е твърде дълго."));
