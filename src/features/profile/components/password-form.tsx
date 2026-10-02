"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authErrorMessage } from "@/features/auth/error-messages";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema } from "@/validation/auth";

type Values = z.infer<typeof changePasswordSchema>;

export function PasswordForm() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setResult(null);
        const { error } = await authClient.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword, revokeOtherSessions: true });
        if (error) setResult({ ok: false, message: error.code === "INVALID_PASSWORD" ? "Текущата парола е грешна." : authErrorMessage(error) });
        else {
          form.reset();
          setResult({ ok: true, message: "Паролата е сменена. Другите устройства са излезли от профила." });
        }
      })}
    >
      {result ? <Alert tone={result.ok ? "success" : "danger"}>{result.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Текуща парола" htmlFor="current-password" error={errors.currentPassword?.message}>
          <Input id="current-password" type="password" autoComplete="current-password" {...form.register("currentPassword")} />
        </Field>
        <Field label="Нова парола" htmlFor="new-password" error={errors.newPassword?.message}>
          <Input id="new-password" type="password" autoComplete="new-password" {...form.register("newPassword")} />
        </Field>
        <Field label="Повтори новата парола" htmlFor="confirm-new-password" error={errors.confirmPassword?.message}>
          <Input id="confirm-new-password" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        </Field>
      </div>
      <Button type="submit" variant="secondary" pending={isSubmitting}>
        Смени паролата
      </Button>
    </form>
  );
}
