import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/features/account/components/account-shell";
import { internalLink } from "@/features/notifications/components/internal-link";
import { MarkAllNotificationsRead, NotificationList } from "@/features/notifications/components/notification-list";
import { countUnreadNotifications, listNotifications } from "@/features/notifications/queries";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Известия" };

export default async function NotificationsPage() {
  const user = await requireUser("/profil/izvestiya");
  const [rows, unread] = await Promise.all([listNotifications(user.id), countUnreadNotifications(user.id)]);
  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    link: internalLink(row.link),
    createdAt: row.createdAt.toISOString(),
    unread: row.readAt === null,
  }));

  return (
    <>
      <PageHeading title="Известия" actions={unread > 0 ? <MarkAllNotificationsRead /> : null} />
      {items.length === 0 ? <EmptyState title="Нямаш известия." /> : <NotificationList items={items} />}
    </>
  );
}
