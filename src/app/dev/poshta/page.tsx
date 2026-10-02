import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { devMailboxEnabled } from "@/config/env";
import { db } from "@/db/client";
import { devEmails } from "@/db/schema";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Поща за разработка", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a key={index} href={part} className="break-all text-brand underline">
            {part}
          </a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Development mailbox. Disabled in production unless MOBITED_DEV_MAILBOX=1. */
export default async function DevMailboxPage() {
  if (!devMailboxEnabled()) notFound();
  const emails = await db.select().from(devEmails).orderBy(desc(devEmails.createdAt)).limit(50);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Поща за разработка</h1>
      <p className="mt-1 text-sm text-muted">Писма, изпратени без конфигуриран доставчик. Достъпно само в режим за разработка.</p>
      <ul className="mt-6 space-y-3">
        {emails.length === 0 ? <li className="text-ink-2">Няма писма.</li> : null}
        {emails.map((email) => (
          <li key={email.id} className="rounded-lg border border-line bg-surface p-4" data-testid="dev-email">
            <p className="text-sm text-muted">
              {formatDateTime(email.createdAt)} · до <span data-testid="dev-email-to">{email.to}</span>
            </p>
            <p className="mt-1 font-semibold">{email.subject}</p>
            <p className="mt-2 text-sm whitespace-pre-line">
              <Linkified text={email.text} />
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
