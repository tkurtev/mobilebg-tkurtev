"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

export function ResendVerification({ email, className }: { email: string; className?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (state === "sent") return <p className={cn("text-sm text-success", className)}>Изпратихме нова връзка за потвърждение.</p>;
  return (
    <button
      type="button"
      disabled={state === "sending" || !email}
      className={cn("text-sm font-medium text-brand underline-offset-2 hover:underline disabled:opacity-60", className)}
      onClick={async () => {
        setState("sending");
        const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/potvarzhdenie" });
        setState(error ? "error" : "sent");
      }}
    >
      {state === "error" ? "Неуспешно изпращане. Опитай пак." : "Изпрати връзката отново"}
    </button>
  );
}
