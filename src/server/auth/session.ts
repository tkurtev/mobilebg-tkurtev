import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/client";
import { dealerMembers, dealers, users } from "@/db/schema";
import { AppError } from "@/server/errors";
import { getAuth } from "./auth";
import { can, type Actor, type Permission, type Role } from "./policies";

export type CurrentUser = Actor & {
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  dealer: { id: string; slug: string; name: string; memberRole: "OWNER" | "MEMBER" } | null;
};

/** Session from Better Auth, then a fresh user row so role or status changes apply immediately. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      status: users.status,
      emailVerified: users.emailVerified,
      dealerId: dealers.id,
      dealerSlug: dealers.slug,
      dealerName: dealers.name,
      dealerStatus: dealers.status,
      memberRole: dealerMembers.role,
    })
    .from(users)
    .leftJoin(dealerMembers, eq(dealerMembers.userId, users.id))
    .leftJoin(dealers, and(eq(dealers.id, dealerMembers.dealerId), isNull(dealers.deletedAt)))
    .where(and(eq(users.id, session.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (!row || row.status !== "ACTIVE") return null;

  const dealer =
    row.dealerId && row.dealerSlug && row.dealerName && row.memberRole && row.dealerStatus === "ACTIVE"
      ? { id: row.dealerId, slug: row.dealerSlug, name: row.dealerName, memberRole: row.memberRole }
      : null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role: row.role as Role,
    emailVerified: row.emailVerified,
    dealerId: dealer?.id ?? null,
    dealer,
  };
});

/** For pages: redirects anonymous visitors to the login page. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/vhod?next=${encodeURIComponent(returnTo)}` : "/vhod");
  }
  return user;
}

/** For pages: renders the 403 page when the permission is missing. */
export async function requirePermission(permission: Permission, returnTo?: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!can(user, permission)) forbidden();
  return user;
}

/** For server actions and route handlers: throws AppError instead of redirecting. */
export async function requireActionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED");
  return user;
}

export async function requireActionPermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireActionUser();
  if (!can(user, permission)) throw new AppError("FORBIDDEN");
  return user;
}
