import { notFound } from "next/navigation";
import { z } from "zod";
import { ThreadView } from "@/features/messages/components/thread-view";
import { getConversationThread } from "@/features/messages/queries";
import { requireUser } from "@/server/auth/session";

export default async function ConversationPage(props: PageProps<"/suobshteniya/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/suobshteniya/${id}`);
  const thread = await getConversationThread(user, id);
  if (!thread) notFound();
  return <ThreadView thread={thread} />;
}
