import type { ReactNode } from "react";
import { countUnreadConversations } from "@/features/messages/unread";
import { countUnreadNotifications } from "@/features/notifications/queries";
import type { CurrentUser } from "@/server/auth/session";
import { AccountNav, type AccountNavItem } from "./account-nav";

/** Layout for every signed-in area: profile, listings, favorites, messages, payments, dealer tools. */
export async function AccountShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const [unreadMessages, unreadNotifications] = await Promise.all([countUnreadConversations(user.id), countUnreadNotifications(user.id)]);
  const items: AccountNavItem[] = [
    { href: "/profil", label: "Общ преглед", match: "exact" },
    { href: "/profil/obiavi", label: "Моите обяви" },
    { href: "/lyubimi", label: "Любими" },
    { href: "/profil/tarseniya", label: "Запазени търсения" },
    { href: "/suobshteniya", label: "Съобщения", badge: unreadMessages },
    { href: "/profil/izvestiya", label: "Известия", badge: unreadNotifications },
    { href: "/profil/plashtaniya", label: "Плащания" },
    user.dealer ? { href: "/profil/dilar", label: "Дилърски панел" } : { href: "/profil/dilar/nov", label: "Стани дилър" },
    { href: "/profil/nastroiki", label: "Настройки" },
  ];

  return (
    <div className="container-page py-4 lg:py-6">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0">
          <p className="mb-2 hidden truncate px-3 text-sm text-muted lg:block">{user.name}</p>
          <AccountNav items={items} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function PageHeading({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
