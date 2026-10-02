import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/features/account/components/account-shell";
import { SettingsForm } from "@/features/admin/components/settings-form";
import { getStoredSettings } from "@/features/admin/queries/settings";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Настройки" };

export default async function AdminSettingsPage() {
  await requirePermission("settings.manage", "/admin/settings");
  const { settings, latest } = await getStoredSettings();

  return (
    <>
      <PageHeading
        title="Настройки"
        description={
          latest ? (
            <>
              Последна промяна от {latest.updatedByName}, {formatDateTime(latest.updatedAt)}.{" "}
              <Link href="/admin/audit?action=settings.update" className="text-brand hover:underline">
                История
              </Link>
            </>
          ) : undefined
        }
      />
      <section className="rounded-lg border border-line bg-surface p-4" aria-label="Настройки на обявите">
        <SettingsForm defaults={settings} />
      </section>
    </>
  );
}
