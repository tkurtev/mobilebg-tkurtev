"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { mergeAnonymousData } from "@/features/account/actions";
import { localFavorites, localRecentlyViewed } from "@/features/favorites/local-store";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/validation/auth";
import { authErrorMessage } from "../error-messages";
import { ResendVerification } from "./resend-verification";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<{ message: string; unverified: boolean } | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const { error: signInError } = await authClient.signIn.email({ email: values.email, password: values.password });
    if (signInError) {
      setError({ message: authErrorMessage(signInError), unverified: signInError.code === "EMAIL_NOT_VERIFIED" });
      return;
    }
    const favoriteIds = localFavorites.read();
    const recentIds = localRecentlyViewed.read();
    if (favoriteIds.length > 0 || recentIds.length > 0) {
      const merged = await mergeAnonymousData({ favoriteIds, recentIds });
      if (merged.ok) {
        localFavorites.clear();
        localRecentlyViewed.clear();
      }
    }
    router.push(next);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert tone="danger">
          {error.message}
          {error.unverified ? <ResendVerification email={form.getValues("email")} className="mt-2" /> : null}
        </Alert>
      ) : null}
      <Field label="Имейл" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
      </Field>
      <Field label="Парола" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
      </Field>
      <div className="flex justify-end">
        <Link href="/zabravena-parola" className="text-sm text-brand hover:underline">
          Забравена парола
        </Link>
      </div>
      <Button type="submit" className="w-full" pending={isSubmitting}>
        Вход
      </Button>
    </form>
  );
}
