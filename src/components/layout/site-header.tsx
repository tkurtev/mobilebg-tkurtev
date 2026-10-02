import { Heart, MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { getActiveCategories } from "@/features/catalog/queries";
import { countUnreadConversations } from "@/features/messages/unread";
import { countUnreadNotifications } from "@/features/notifications/queries";
import { getCurrentUser } from "@/server/auth/session";
import { can } from "@/server/auth/policies";
import { CategoryNav } from "./category-nav";
import type { HeaderUser } from "./header-types";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { MobileSearch } from "./mobile-search";
import { UserMenu } from "./user-menu";

async function loadHeaderUser(): Promise<HeaderUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const [unreadMessages, unreadNotifications] = await Promise.all([
    countUnreadConversations(user.id),
    countUnreadNotifications(user.id),
  ]);
  return {
    name: user.name,
    email: user.email,
    isStaff: can(user, "admin.access"),
    hasDealer: user.dealer !== null,
    unreadMessages,
    unreadNotifications,
  };
}

const ICON_LINK = "relative flex h-10 items-center gap-2 rounded-md px-2.5 text-sm text-ink-2 hover:bg-subtle hover:text-ink";

export async function SiteHeader() {
  const [categories, user] = await Promise.all([getActiveCategories(), loadHeaderUser()]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="container-page flex h-14 items-center gap-2 sm:gap-4 lg:gap-6">
        <Logo />
        <HeaderSearch className="hidden max-w-lg flex-1 md:flex" />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <MobileSearch />
          <Link href="/lyubimi" className={ICON_LINK} aria-label="Любими">
            <Heart className="size-5" aria-hidden="true" />
            <span className="hidden xl:inline">Любими</span>
          </Link>
          {user ? (
            <Link href="/suobshteniya" className={`${ICON_LINK} hidden sm:flex`} aria-label={user.unreadMessages > 0 ? `Съобщения, ${user.unreadMessages} непрочетени` : "Съобщения"}>
              <MessageSquare className="size-5" aria-hidden="true" />
              <span className="hidden xl:inline">Съобщения</span>
              {user.unreadMessages > 0 ? (
                <span className="absolute top-1 left-6 min-w-4.5 rounded-full bg-danger px-1 text-center text-[11px] leading-4.5 font-semibold text-white tabular xl:static xl:ml-0.5">
                  {user.unreadMessages}
                </span>
              ) : null}
            </Link>
          ) : null}
          {user ? (
            <div className="hidden lg:block">
              <UserMenu user={user} />
            </div>
          ) : (
            <Link href="/vhod" className={`${ICON_LINK} hidden lg:flex`}>
              Вход
            </Link>
          )}
          <ButtonLink href="/publikuvai" size="sm" className="ml-1 h-9 sm:h-10 sm:px-4" icon={<Plus className="size-4" aria-hidden="true" />}>
            <span className="sm:hidden">Обява</span>
            <span className="hidden sm:inline">Публикувай обява</span>
          </ButtonLink>
          <MobileMenu categories={categories} user={user} />
        </div>
      </div>
      <div className="border-t border-line">
        <CategoryNav categories={categories} />
      </div>
    </header>
  );
}
