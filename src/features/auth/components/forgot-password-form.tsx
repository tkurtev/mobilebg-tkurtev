"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/validation/auth";
import { authErrorMessage } from "../error-messages";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;

  if (sent) {
    return (
      <Alert tone="success" title="Провери пощата си">
        Ако има профил с този имейл, ще получиш връзка за нова парола до няколко минути.
      </Alert>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async ({ email }) => {
        setError(null);
        const { error: requestError } = await authClient.requestPasswordReset({ email, redirectTo: "/nova-parola" });
        if (requestError && requestError.status === 429) setError(authErrorMessage(requestError));
        else setSent(true);
      })}
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="Имейл" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
      </Field>
      <Button type="submit" className="w-full" pending={isSubmitting}>
        Изпрати връзка
      </Button>
    </form>
  );
}
