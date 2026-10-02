import type { Metadata } from "next";
import { AccountShell } from "@/features/account/components/account-shell";
import { ConversationList } from "@/features/messages/components/conversation-list";
import { MessagesSplit } from "@/features/messages/components/messages-split";
import { listConversations } from "@/features/messages/queries";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Съобщения", robots: { index: false, follow: false } };

/** Pages below call requireUser with their own path, so a login from a thread link returns to that thread. */
export default async function MessagesLayout({ children }: LayoutProps<"/suobshteniya">) {
  const user = await getCurrentUser();
  if (!user) return children;
  const page = await listConversations(user.id);
  return (
    <AccountShell user={user}>
      <MessagesSplit list={page.items.length > 0 ? <ConversationList initial={page} /> : null}>{children}</MessagesSplit>
    </AccountShell>
  );
}
