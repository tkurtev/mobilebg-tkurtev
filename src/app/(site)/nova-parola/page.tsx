import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Нова парола", robots: { index: false } };

export default async function ResetPasswordPage(props: PageProps<"/nova-parola">) {
  const params = await props.searchParams;
  const token = typeof params.token === "string" ? params.token : null;
  return (
    <AuthCard title="Нова парола">
      {token && !params.error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <Alert tone="danger" title="Връзката е невалидна или е изтекла" />
          <Link href="/zabravena-parola" className="font-medium text-brand hover:underline">
            Заяви нова връзка
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
