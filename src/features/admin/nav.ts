import type { Permission } from "@/server/auth/policies";

export type AdminNavEntry = {
  href: string;
  label: string;
  permission: Permission;
  match?: "exact" | "prefix";
  badge?: "openReports";
};

export const ADMIN_NAV: readonly AdminNavEntry[] = [
  { href: "/admin", label: "Табло", permission: "admin.access", match: "exact" },
  { href: "/admin/listings", label: "Обяви", permission: "listings.moderate" },
  { href: "/admin/reports", label: "Сигнали", permission: "reports.manage", badge: "openReports" },
  { href: "/admin/users", label: "Потребители", permission: "users.view" },
  { href: "/admin/dealers", label: "Дилъри", permission: "dealers.manage" },
  { href: "/admin/categories", label: "Категории", permission: "categories.manage" },
  { href: "/admin/vehicle-data", label: "Марки и модели", permission: "taxonomy.manage" },
  { href: "/admin/payments", label: "Плащания", permission: "payments.view" },
  { href: "/admin/audit", label: "Одит", permission: "audit.view" },
  { href: "/admin/settings", label: "Настройки", permission: "settings.manage" },
];
