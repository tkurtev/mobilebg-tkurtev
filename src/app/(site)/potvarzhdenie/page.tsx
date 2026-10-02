import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { AuthCard } from "@/features/auth/components/auth-card";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Потвърждение на имейл", robots: { index: false } };

export default async function VerificationResultPage(props: PageProps<"/potvarzhdenie">) {
  const params = await props.searchParams;
  const user = await getCurrentUser();
  const failed = typeof params.error === "string";

  return (
    <AuthCard title="Потвърждение на имейл">
      {failed ? (
        <div className="space-y-4">
          <Alert tone="danger" title="Връзката е невалидна или е изтекла">
            Влез в профила си и ще ти изпратим нова връзка.
          </Alert>
          <Link href="/vhod" className="font-medium text-brand hover:underline">
            Към вход
          </Link>
        </div>
      ) : user?.emailVerified ? (
        <div className="space-y-4">
          <Alert tone="success" title="Имейлът е потвърден">
            Профилът ти е активен.
          </Alert>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/publikuvai">Публикувай обява</ButtonLink>
            <ButtonLink href="/profil" variant="secondary">
              Към профила
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Alert tone="info">Отвори връзката от писмото, което ти изпратихме.</Alert>
          <Link href="/vhod" className="font-medium text-brand hover:underline">
            Към вход
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
