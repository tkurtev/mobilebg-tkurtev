"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/validation/auth";
import { authErrorMessage } from "../error-messages";

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });
  const { errors, isSubmitting } = form.formState;

  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Паролата е сменена">
          Можеш да влезеш с новата си парола.
        </Alert>
        <Link href="/vhod" className="font-medium text-brand hover:underline">
          Към вход
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async ({ password }) => {
        setError(null);
        const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
        if (resetError) setError(authErrorMessage(resetError));
        else setDone(true);
      })}
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="Нова парола" htmlFor="password" error={errors.password?.message} hint="Поне 8 символа, буква и цифра.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
      </Field>
      <Field label="Повтори паролата" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" className="w-full" pending={isSubmitting}>
        Запази паролата
      </Button>
    </form>
  );
}
