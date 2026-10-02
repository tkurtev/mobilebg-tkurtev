import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusLabel } from "@/components/ui/status-label";
import { AdminTable, AdminTableHead, EmptyRow, SectionHeading, Td, Th, Tr } from "@/features/admin/components/admin-table";
import { DealerForm, DealerStatusButton } from "@/features/admin/components/dealer-controls";
import { DEALER_MEMBER_ROLE_LABELS, DEALER_STATUS_LABELS, DEALER_STATUS_TONES, USER_STATUS_LABELS } from "@/features/admin/labels";
import { getAdminDealer } from "@/features/admin/queries/dealers";
import { getCities, getRegions } from "@/features/catalog/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { formatBgPhone } from "@/lib/phone";
import { requirePermission } from "@/server/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Дилър" };

export default async function AdminDealerPage(props: PageProps<"/admin/dealers/[id]">) {
  const { id } = await props.params;
  await requirePermission("dealers.manage", `/admin/dealers/${id}`);
  if (!UUID.test(id)) notFound();
  const [detail, regions, cities] = await Promise.all([getAdminDealer(id), getRegions(), getCities()]);
  if (!detail) notFound();
  const { dealer } = detail;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Администрация", href: "/admin" },
          { label: "Дилъри", href: "/admin/dealers" },
          { label: dealer.name },
        ]}
      />
      <div className="mt-2 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{dealer.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <StatusLabel tone={DEALER_STATUS_TONES[dealer.status]}>{DEALER_STATUS_LABELS[dealer.status]}</StatusLabel>
            <span>
              {formatNumber(detail.activeListings)} активни от {formatNumber(detail.totalListings)} обяви
            </span>
            <span>Създаден {formatDate(dealer.createdAt)}</span>
            {dealer.status === "ACTIVE" ? (
              <Link href={`/dilari/${dealer.slug}`} className="text-brand hover:underline" target="_blank" rel="noreferrer">
                Публичен профил
              </Link>
            ) : null}
          </p>
        </div>
        <DealerStatusButton dealerId={dealer.id} dealerName={dealer.name} status={dealer.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section aria-labelledby="dealer-edit-heading" className="rounded-lg border border-line bg-surface p-4">
          <SectionHeading id="dealer-edit-heading">Данни на дилъра</SectionHeading>
          <DealerForm
            regions={regions}
            cities={cities}
            defaults={{
              dealerId: dealer.id,
              name: dealer.name,
              phone: formatBgPhone(dealer.phone),
              email: dealer.email ?? "",
              website: dealer.website ?? "",
              address: dealer.address,
              description: dealer.description,
              regionId: dealer.regionId ?? "",
              cityId: dealer.cityId ?? "",
            }}
          />
        </section>

        <section aria-labelledby="members-heading">
          <SectionHeading id="members-heading">Служители ({detail.members.length})</SectionHeading>
          <AdminTable caption="Служители" minWidth={420}>
            <AdminTableHead>
              <Th>Име</Th>
              <Th>Имейл</Th>
              <Th>Роля</Th>
            </AdminTableHead>
            <tbody>
              {detail.members.length === 0 ? (
                <EmptyRow colSpan={3}>Няма служители.</EmptyRow>
              ) : (
                detail.members.map((member) => (
                  <Tr key={member.userId}>
                    <Td>
                      <Link href={`/admin/users/${member.userId}`} className="text-brand hover:underline">
                        {member.name}
                      </Link>
                      {member.userStatus !== "ACTIVE" ? <span className="block text-xs text-danger">{USER_STATUS_LABELS[member.userStatus]}</span> : null}
                    </Td>
                    <Td className="break-all text-ink-2">{member.email}</Td>
                    <Td className="whitespace-nowrap">{DEALER_MEMBER_ROLE_LABELS[member.role]}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </AdminTable>
          <p className="mt-3 text-sm">
            <Link href={`/admin/audit?targetType=dealer&targetId=${dealer.id}`} className="text-brand hover:underline">
              История на промените
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
