import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Забравена парола", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Забравена парола"
      description="Въведи имейла на профила си и ще ти изпратим връзка за нова парола."
      footer={
        <Link href="/vhod" className="font-medium text-brand hover:underline">
          Обратно към вход
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
