"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FieldError, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/validation/auth";
import { authErrorMessage } from "../error-messages";
import { ResendVerification } from "./resend-verification";

export function RegisterForm({ devMailbox }: { devMailbox: boolean }) {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", acceptTerms: false as unknown as true },
  });
  const { errors, isSubmitting } = form.formState;

  if (sentTo) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Провери пощата си">
          Изпратихме връзка за потвърждение на <strong>{sentTo}</strong>. Профилът се активира след потвърждение.
        </Alert>
        <ResendVerification email={sentTo} />
        {devMailbox ? (
          <p className="text-sm text-muted">
            Режим за разработка: писмата се виждат в{" "}
            <Link href="/dev/poshta" className="font-medium text-brand underline">
              пощата за разработка
            </Link>
            .
          </p>
        ) : null}
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const { data, error: signUpError } = await authClient.signUp.email({
      name: values.name.trim(),
      email: values.email,
      password: values.password,
      callbackURL: "/potvarzhdenie",
    });
    if (signUpError) {
      setError(authErrorMessage(signUpError));
      return;
    }
    // Without required verification the account is signed in right away.
    if (data?.token) {
      router.push("/profil");
      router.refresh();
      return;
    }
    setSentTo(values.email);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="Име" htmlFor="name" error={errors.name?.message}>
        <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
      </Field>
      <Field label="Имейл" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
      </Field>
      <Field label="Парола" htmlFor="password" error={errors.password?.message} hint="Поне 8 символа, буква и цифра.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
      </Field>
      <Field label="Повтори паролата" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} {...form.register("confirmPassword")} />
      </Field>
      <div>
        <Checkbox
          {...form.register("acceptTerms")}
          label={
            <>
              Приемам{" "}
              <Link href="/usloviya" className="text-brand underline" target="_blank">
                условията за ползване
              </Link>
            </>
          }
        />
        <FieldError message={errors.acceptTerms?.message} />
      </div>
      <Button type="submit" className="w-full" pending={isSubmitting}>
        Регистрация
      </Button>
    </form>
  );
}
