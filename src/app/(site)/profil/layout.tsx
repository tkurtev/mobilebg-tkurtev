import type { Metadata } from "next";
import { AccountShell } from "@/features/account/components/account-shell";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Every page below calls requireUser with its own path, so anonymous visitors return to the page they asked for. */
export default async function ProfileLayout({ children }: LayoutProps<"/profil">) {
  const user = await getCurrentUser();
  if (!user) return children;
  return <AccountShell user={user}>{children}</AccountShell>;
}
