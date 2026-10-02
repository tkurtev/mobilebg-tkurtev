import { db } from "@/db/client";
import { devEmails } from "@/db/schema";
import { devMailboxEnabled, env } from "@/config/env";
import type { EmailContent } from "@/emails/layout";

export type OutgoingEmail = EmailContent & { to: string };

interface EmailTransport {
  send(email: OutgoingEmail): Promise<void>;
}

class ResendTransport implements EmailTransport {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(email: OutgoingEmail): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
    });
    if (!response.ok) {
      throw new Error(`Email provider responded with ${response.status}`);
    }
  }
}

/** Fallback without a provider: logs to the server console and fills the development mailbox. */
class LogTransport implements EmailTransport {
  async send(email: OutgoingEmail): Promise<void> {
    console.info(`[email] to=${email.to} subject="${email.subject}"\n${email.text}`);
    if (devMailboxEnabled()) {
      await db.insert(devEmails).values({ to: email.to, subject: email.subject, text: email.text, html: email.html });
    }
  }
}

function getTransport(): EmailTransport {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (RESEND_API_KEY) return new ResendTransport(RESEND_API_KEY, EMAIL_FROM ?? "MobiTed <no-reply@mobited.bg>");
  return new LogTransport();
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  await getTransport().send(email);
}
