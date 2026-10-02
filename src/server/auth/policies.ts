export type Role = "USER" | "DEALER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export const ROLES: readonly Role[] = ["USER", "DEALER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

export const ROLE_LABELS: Record<Role, string> = {
  USER: "Потребител",
  DEALER: "Дилър",
  MODERATOR: "Модератор",
  ADMIN: "Администратор",
  SUPER_ADMIN: "Главен администратор",
};

const STAFF_LEVEL: Record<Role, number> = { USER: 0, DEALER: 0, MODERATOR: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export type Permission =
  | "admin.access"
  | "listings.moderate"
  | "reports.manage"
  | "users.view"
  | "users.suspend"
  | "users.changeRole"
  | "dealers.manage"
  | "categories.manage"
  | "taxonomy.manage"
  | "payments.view"
  | "audit.view"
  | "settings.manage";

const PERMISSION_LEVEL: Record<Permission, number> = {
  "admin.access": 1,
  "listings.moderate": 1,
  "reports.manage": 1,
  "users.view": 1,
  "users.suspend": 2,
  "users.changeRole": 2,
  "dealers.manage": 2,
  "categories.manage": 2,
  "taxonomy.manage": 2,
  "payments.view": 2,
  "audit.view": 2,
  "settings.manage": 3,
};

export type Actor = { id: string; role: Role; dealerId: string | null };

export function staffLevel(role: Role): number {
  return STAFF_LEVEL[role];
}

export function can(actor: Actor | null, permission: Permission): boolean {
  if (!actor) return false;
  return STAFF_LEVEL[actor.role] >= PERMISSION_LEVEL[permission];
}

export type ListingOwnership = { sellerId: string; dealerId: string | null };

/** Sellers manage their own listings; dealer listings are managed by any member of that dealer. */
export function canManageListing(actor: Actor | null, listing: ListingOwnership): boolean {
  if (!actor) return false;
  if (listing.sellerId === actor.id) return true;
  return listing.dealerId !== null && listing.dealerId === actor.dealerId;
}

export type ListingVisibility = ListingOwnership & { status: string; expiresAt: Date | null; deletedAt: Date | null };

export function isPubliclyVisible(listing: Pick<ListingVisibility, "status" | "expiresAt" | "deletedAt">, now = new Date()): boolean {
  return (
    listing.status === "ACTIVE" && listing.deletedAt === null && (listing.expiresAt === null || listing.expiresAt > now)
  );
}

/** Sold listings stay reachable by URL so shared links show "Продадена" instead of 404. */
export function canViewListing(actor: Actor | null, listing: ListingVisibility, now = new Date()): boolean {
  if (isPubliclyVisible(listing, now)) return true;
  if (listing.deletedAt === null && listing.status === "SOLD") return true;
  if (canManageListing(actor, listing)) return listing.deletedAt === null;
  return can(actor, "listings.moderate");
}

/**
 * Admins assign roles up to MODERATOR and cannot touch other admins.
 * Only super admins grant or revoke ADMIN and SUPER_ADMIN. Nobody changes their own role.
 */
export function canAssignRole(actor: Actor | null, target: { id: string; role: Role }, newRole: Role): boolean {
  if (!actor || !can(actor, "users.changeRole")) return false;
  if (actor.id === target.id) return false;
  if (actor.role === "SUPER_ADMIN") return true;
  return STAFF_LEVEL[target.role] < STAFF_LEVEL.ADMIN && STAFF_LEVEL[newRole] < STAFF_LEVEL.ADMIN;
}

export function canSuspendUser(actor: Actor | null, target: { id: string; role: Role }): boolean {
  if (!actor || !can(actor, "users.suspend")) return false;
  if (actor.id === target.id) return false;
  return STAFF_LEVEL[actor.role] > STAFF_LEVEL[target.role];
}

export function canManageDealer(actor: Actor | null, dealerId: string, memberRole?: "OWNER" | "MEMBER" | null): boolean {
  if (!actor) return false;
  if (can(actor, "dealers.manage")) return true;
  return actor.dealerId === dealerId && memberRole === "OWNER";
}
