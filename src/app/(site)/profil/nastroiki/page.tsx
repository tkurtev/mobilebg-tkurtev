import type { Metadata } from "next";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PageHeading } from "@/features/account/components/account-shell";
import { getCities, getRegions } from "@/features/catalog/queries";
import { DeleteAccount } from "@/features/profile/components/delete-account";
import { PasswordForm } from "@/features/profile/components/password-form";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { SessionList } from "@/features/profile/components/session-list";
import { getProfile, getUserSessions } from "@/features/profile/queries";
import { formatBgPhone } from "@/lib/phone";
import { getCurrentSession, requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const user = await requireUser("/profil/nastroiki");
  const [profile, sessionRows, currentSession, regions, cities] = await Promise.all([getProfile(user.id), getUserSessions(user.id), getCurrentSession(), getRegions(), getCities()]);

  return (
    <>
      <PageHeading title="Настройки" />
      <div className="space-y-5">
        <Panel>
          <PanelHeader title="Профил" />
          <PanelBody>
            <ProfileForm
              email={user.email}
              regions={regions}
              cities={cities}
              defaults={{ name: user.name, phone: profile.phone ? formatBgPhone(profile.phone) : "", regionId: profile.regionId ?? null, cityId: profile.cityId ?? null }}
            />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Парола" />
          <PanelBody>
            <PasswordForm />
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader title="Активни сесии" />
          <PanelBody>
            <SessionList
              sessions={sessionRows.map((session) => ({
                id: session.id,
                device: session.device,
                ipAddress: session.ipAddress,
                createdAt: session.createdAt.toISOString(),
                updatedAt: session.updatedAt.toISOString(),
                current: session.id === currentSession?.session.id,
              }))}
            />
          </PanelBody>
        </Panel>
        <Panel className="border-danger/30">
          <PanelHeader title="Изтриване на профила" />
          <PanelBody className="space-y-3">
            <p className="text-sm text-ink-2">Профилът се деактивира, а обявите се архивират. Историята на плащанията се запазва.</p>
            <DeleteAccount email={user.email} />
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}
