import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PageHeading } from "@/features/account/components/account-shell";
import { getCities, getRegions } from "@/features/catalog/queries";
import { DealerLogo } from "@/features/dealers/components/dealer-logo";
import { DealerMembers } from "@/features/dealers/components/dealer-members";
import { DealerProfileForm } from "@/features/dealers/components/dealer-profile-form";
import { LogoUploader } from "@/features/dealers/components/logo-uploader";
import { OpeningHoursForm } from "@/features/dealers/components/opening-hours-form";
import { OpeningHoursTable } from "@/features/dealers/components/opening-hours-table";
import { getDealerSettings, type DealerSettings } from "@/features/dealers/queries";
import { formatBgPhone } from "@/lib/phone";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Настройки на дилъра" };

function ReadOnlyProfile({ dealer }: { dealer: DealerSettings }) {
  const rows = [
    { label: "Име на фирмата", value: dealer.name },
    { label: "Телефон", value: formatBgPhone(dealer.phone) },
    { label: "Имейл за контакт", value: dealer.email },
    { label: "Уебсайт", value: dealer.website },
    { label: "Област", value: dealer.regionName },
    { label: "Град", value: dealer.cityName },
    { label: "Адрес", value: dealer.address },
    { label: "Описание", value: dealer.description },
  ];
  return (
    <dl className="divide-y divide-line text-[15px]">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-sm text-muted">{row.label}</dt>
          <dd className="whitespace-pre-line text-ink">{row.value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function DealerSettingsPage() {
  const user = await requireUser("/profil/dilar/nastroiki");
  if (!user.dealer) redirect("/profil/dilar/nov");
  const [dealer, regions, cities] = await Promise.all([getDealerSettings(user.dealer.id), getRegions(), getCities()]);
  if (!dealer) notFound();
  const isOwner = user.dealer.memberRole === "OWNER";

  return (
    <div className="space-y-4" data-testid="dealer-settings">
      <PageHeading
        title="Настройки на дилъра"
        description={dealer.name}
        actions={
          <ButtonLink href="/profil/dilar" variant="secondary" size="sm">
            Към панела
          </ButtonLink>
        }
      />

      {!isOwner ? <Alert tone="info">Само собственикът може да променя данните на дилъра. Свържи се с него, ако нещо трябва да се коригира.</Alert> : null}

      <Panel aria-labelledby="dealer-profile-heading">
        <PanelHeader title={<span id="dealer-profile-heading">Профил</span>} />
        <PanelBody>
          {isOwner ? (
            <DealerProfileForm
              mode="edit"
              regions={regions.map((region) => ({ id: region.id, name: region.name }))}
              cities={cities.map((city) => ({ id: city.id, name: city.name, regionId: city.regionId }))}
              defaultValues={{
                name: dealer.name,
                phone: formatBgPhone(dealer.phone).replace(/\s/g, " "),
                email: dealer.email ?? "",
                website: dealer.website ?? "",
                regionId: dealer.regionId ?? "",
                cityId: dealer.cityId ?? "",
                address: dealer.address,
                description: dealer.description,
              }}
            />
          ) : (
            <ReadOnlyProfile dealer={dealer} />
          )}
        </PanelBody>
      </Panel>

      <Panel aria-labelledby="dealer-logo-heading">
        <PanelHeader title={<span id="dealer-logo-heading">Лого</span>} />
        <PanelBody>
          {isOwner ? <LogoUploader name={dealer.name} logoUrl={dealer.logoUrl} /> : <DealerLogo name={dealer.name} logoUrl={dealer.logoUrl} className="size-24 text-3xl" />}
        </PanelBody>
      </Panel>

      <Panel aria-labelledby="dealer-hours-heading">
        <PanelHeader title={<span id="dealer-hours-heading">Работно време</span>} />
        <PanelBody>
          {isOwner ? (
            <OpeningHoursForm hours={dealer.hours} />
          ) : (
            <div className="max-w-sm">
              <OpeningHoursTable hours={dealer.hours} today={null} caption="Работно време" />
            </div>
          )}
        </PanelBody>
      </Panel>

      <Panel aria-labelledby="dealer-team-heading">
        <PanelHeader title={<span id="dealer-team-heading">Екип</span>} />
        <PanelBody>
          <DealerMembers
            members={dealer.members.map(({ userId, name, email, role }) => ({ userId, name, email, role }))}
            currentUserId={user.id}
            canManage={isOwner}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}
