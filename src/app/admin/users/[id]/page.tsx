import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusLabel } from "@/components/ui/status-label";
import { LISTING_STATUS_LABELS, type ListingStatus } from "@/config/listing-status";
import { DetailList, SectionHeading } from "@/features/admin/components/admin-table";
import { AuditTable } from "@/features/admin/components/audit-table";
import { SuspendUserDialog, UnsuspendUserButton, UserRoleForm } from "@/features/admin/components/user-controls";
import { DEALER_MEMBER_ROLE_LABELS, USER_STATUS_LABELS, USER_STATUS_TONES } from "@/features/admin/labels";
import { getAdminUser, getUserAuditEntries } from "@/features/admin/queries/users";
import { formatDateTime, formatNumber } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { formatBgPhone } from "@/lib/phone";
import { can, canAssignRole, canSuspendUser, ROLE_LABELS, ROLES, type Role } from "@/server/auth/policies";
import { requirePermission } from "@/server/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_ORDER: ListingStatus[] = ["ACTIVE", "PENDING", "PAUSED", "REJECTED", "EXPIRED", "SOLD", "DRAFT", "ARCHIVED"];

export const metadata: Metadata = { title: "Потребител" };

export default async function AdminUserPage(props: PageProps<"/admin/users/[id]">) {
  const { id } = await props.params;
  const actor = await requirePermission("users.view", `/admin/users/${id}`);
  if (!UUID.test(id)) notFound();
  const detail = await getAdminUser(id);
  if (!detail) notFound();
  const showAudit = can(actor, "audit.view");
  const auditEntries = showAudit ? await getUserAuditEntries(id, 20) : [];

  const { user } = detail;
  const target = { id: user.id, role: user.role as Role };
  const allowedRoles = ROLES.filter((role) => role !== user.role && canAssignRole(actor, target, role));
  const canChangeRole = can(actor, "users.changeRole") && allowedRoles.length > 0 && !user.deletedAt;
  const canSuspend = canSuspendUser(actor, target) && !user.deletedAt;
  const statusCounts = STATUS_ORDER.filter((status) => (detail.listingsByStatus[status] ?? 0) > 0);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Администрация", href: "/admin" },
          { label: "Потребители", href: "/admin/users" },
          { label: user.name },
        ]}
      />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-semibold tracking-tight break-words">{user.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
          <span className="break-all">{user.email}</span>
          <span>{ROLE_LABELS[user.role]}</span>
          <StatusLabel tone={USER_STATUS_TONES[user.status]}>{USER_STATUS_LABELS[user.status]}</StatusLabel>
          {user.deletedAt ? <span className="text-danger">Изтрит {formatDateTime(user.deletedAt)}</span> : null}
        </p>
      </div>

      {user.status === "SUSPENDED" ? (
        <Alert tone="danger" title="Потребителят е спрян" className="mb-4">
          {user.suspensionReason ? <p>{user.suspensionReason}</p> : null}
          {user.suspendedAt ? <p className="text-muted">От {formatDateTime(user.suspendedAt)}</p> : null}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section aria-labelledby="profile-heading" className="rounded-lg border border-line bg-surface p-4">
          <SectionHeading id="profile-heading">Профил</SectionHeading>
          <DetailList
            items={[
              { label: "Регистрация", value: formatDateTime(user.createdAt) },
              { label: "Имейл потвърден", value: user.emailVerified ? "Да" : "Не" },
              { label: "Телефон", value: detail.phone ? formatBgPhone(detail.phone) : "-" },
              { label: "Град", value: detail.cityName ?? "-" },
              {
                label: "Дилър",
                value: detail.dealerId ? (
                  <>
                    {can(actor, "dealers.manage") ? (
                      <Link href={`/admin/dealers/${detail.dealerId}`} className="text-brand hover:underline">
                        {detail.dealerName}
                      </Link>
                    ) : (
                      detail.dealerName
                    )}
                    {detail.dealerRole ? <span className="text-muted"> ({DEALER_MEMBER_ROLE_LABELS[detail.dealerRole]})</span> : null}
                  </>
                ) : (
                  "-"
                ),
              },
              { label: "Активни сесии", value: formatNumber(detail.sessionCount) },
            ]}
          />
        </section>

        <section aria-labelledby="activity-heading" className="rounded-lg border border-line bg-surface p-4">
          <SectionHeading id="activity-heading">Активност</SectionHeading>
          <p className="mb-1 text-sm font-medium text-ink-2">Обяви по статус</p>
          {statusCounts.length === 0 ? (
            <p className="text-sm text-muted">Няма обяви.</p>
          ) : (
            <DetailList items={statusCounts.map((status) => ({ label: LISTING_STATUS_LABELS[status], value: formatNumber(detail.listingsByStatus[status] ?? 0) }))} />
          )}
          <DetailList
            className="mt-3 border-t border-line pt-3"
            items={[{ label: "Плащания", value: `${formatNumber(detail.paymentCount)}, успешни за ${formatPrice(detail.paymentSucceededCents)}` }]}
          />
          {can(actor, "listings.moderate") ? (
            <p className="mt-3 text-sm">
              <Link href={`/admin/listings?sellerId=${user.id}`} className="text-brand hover:underline">
                Обявите на потребителя
              </Link>
            </p>
          ) : null}
        </section>
      </div>

      {canChangeRole || canSuspend ? (
        <section aria-labelledby="manage-heading" className="mt-6 rounded-lg border border-line bg-surface p-4">
          <SectionHeading id="manage-heading">Управление</SectionHeading>
          <div className="flex flex-wrap items-end justify-between gap-4">
            {canChangeRole ? <UserRoleForm userId={user.id} currentRole={user.role} allowedRoles={allowedRoles} /> : <span />}
            {canSuspend ? user.status === "SUSPENDED" ? <UnsuspendUserButton userId={user.id} /> : <SuspendUserDialog userId={user.id} userName={user.name} /> : null}
          </div>
        </section>
      ) : null}

      {showAudit ? (
        <section aria-labelledby="audit-heading" className="mt-6">
          <SectionHeading
            id="audit-heading"
            actions={
              <Link href={`/admin/audit?targetType=user&targetId=${user.id}`} className="text-sm text-brand hover:underline">
                Целият одит
              </Link>
            }
          >
            Последни записи в одита
          </SectionHeading>
          <AuditTable entries={auditEntries} emptyText="Няма записи за този потребител." />
        </section>
      ) : null}
    </>
  );
}
