import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { devMailboxEnabled } from "@/config/env";
import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Регистрация", robots: { index: false } };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/profil");
  return (
    <AuthCard
      title="Регистрация"
      description="Профилът е безплатен. С него публикуваш обяви, пазиш любими и пишеш на продавачи."
      footer={
        <>
          Имаш профил?{" "}
          <Link href="/vhod" className="font-medium text-brand hover:underline">
            Вход
          </Link>
        </>
      }
    >
      <RegisterForm devMailbox={devMailboxEnabled()} />
    </AuthCard>
  );
}
