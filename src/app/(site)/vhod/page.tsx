import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Вход", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/vhod">) {
  const params = await props.searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthCard
      title="Вход в MobiTed"
      footer={
        <>
          Нямаш профил?{" "}
          <Link href={`/registratsiya${params.next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand hover:underline">
            Регистрирай се
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}
