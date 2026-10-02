import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/layout/logo";
import { AdminNav, type AdminNavItem } from "@/features/admin/components/admin-nav";
import { ADMIN_NAV } from "@/features/admin/nav";
import { countOpenReports } from "@/features/admin/queries/reports";
import { can, ROLE_LABELS } from "@/server/auth/policies";
import { forbidden } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: { default: "Администрация", template: "%s | Администрация MobiTed" },
  robots: { index: false, follow: false },
};

/** Every admin page calls requirePermission with its own path, so anonymous visitors return to the page they asked for. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  if (!user) return children;
  if (!can(user, "admin.access")) forbidden();
  const openReports = can(user, "reports.manage") ? await countOpenReports() : 0;
  const items: AdminNavItem[] = ADMIN_NAV.filter((entry) => can(user, entry.permission)).map((entry) => ({
    href: entry.href,
    label: entry.label,
    match: entry.match,
    badge: entry.badge === "openReports" ? openReports : undefined,
  }));

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#admin-main" className="sr-only z-50 rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Към съдържанието
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="flex h-12 items-center gap-3 px-4 lg:px-6">
          <Link href="/admin" className="flex min-w-0 items-baseline gap-2 rounded-sm">
            <Wordmark className="text-lg" />
            <span className="truncate text-sm font-medium text-ink-2">Администрация</span>
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-4 text-sm">
            <span className="hidden min-w-0 truncate text-ink-2 sm:block">
              {user.name} <span className="text-muted">({ROLE_LABELS[user.role]})</span>
            </span>
            <Link href="/" className="shrink-0 text-brand hover:underline">
              Към сайта
            </Link>
          </div>
        </div>
      </header>
      <div className="flex-1 lg:grid lg:grid-cols-[216px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-surface lg:border-r lg:border-b-0">
          <div className="lg:sticky lg:top-12">
            <AdminNav items={items} />
          </div>
        </aside>
        <main id="admin-main" className="min-w-0 px-4 py-4 lg:px-6 lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
