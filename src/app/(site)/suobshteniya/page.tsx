import { MessageSquare } from "lucide-react";
import { requireUser } from "@/server/auth/session";

/** Desktop right pane before a conversation is selected; hidden on mobile where the list fills the page. */
export default async function MessagesIndexPage() {
  await requireUser("/suobshteniya");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted">
      <MessageSquare className="size-6" aria-hidden="true" />
      <p>Избери разговор</p>
    </div>
  );
}
