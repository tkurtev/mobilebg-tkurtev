"use client";

import { Phone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type PhoneRevealProps = { listingId: string; masked: string; className?: string; variant?: "primary" | "secondary" };

export function PhoneReveal({ listingId, masked, className, variant = "primary" }: PhoneRevealProps) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "error"; message?: string } | { status: "done"; display: string; tel: string }>({ status: "idle" });

  if (state.status === "done") {
    return (
      <a href={`tel:${state.tel}`} className={buttonClasses({ variant, className: cn("w-full tabular", className) })}>
        <Phone className="size-4" aria-hidden="true" />
        {state.display}
      </a>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        className={buttonClasses({ variant, className: "w-full" })}
        disabled={state.status === "loading"}
        onClick={async () => {
          setState({ status: "loading" });
          try {
            const response = await fetch(`/api/obiavi/${listingId}/telefon`, { method: "POST" });
            const data: { display?: string; tel?: string; error?: string } = await response.json();
            if (response.ok && data.display && data.tel) setState({ status: "done", display: data.display, tel: data.tel });
            else setState({ status: "error", message: data.error ?? "Телефонът не може да бъде показан." });
          } catch {
            setState({ status: "error", message: "Няма връзка. Опитай отново." });
          }
        }}
      >
        {state.status === "loading" ? <Spinner className="size-4" /> : <Phone className="size-4" aria-hidden="true" />}
        <span className="tabular">{masked}</span>
        <span className="font-normal opacity-80">Покажи</span>
      </button>
      {state.status === "error" ? (
        <p className="mt-1.5 text-sm text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
