"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/field";
import { addDealerMemberAction, removeDealerMemberAction } from "../actions";

export type DealerMemberView = { userId: string; name: string; email: string; role: "OWNER" | "MEMBER" };

const ROLE_LABELS: Record<DealerMemberView["role"], string> = { OWNER: "Собственик", MEMBER: "Служител" };

export function DealerMembers({ members, currentUserId, canManage }: { members: DealerMemberView[]; currentUserId: string; canManage: boolean }) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const ownerCount = members.filter((member) => member.role === "OWNER").length;

  return (
    <div className="space-y-4" data-testid="dealer-members">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <ul className="divide-y divide-line rounded-md border border-line">
        {members.map((member) => {
          const removable = canManage && member.userId !== currentUserId && !(member.role === "OWNER" && ownerCount <= 1);
          return (
            <li key={member.userId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">
                  {member.name}
                  {member.userId === currentUserId ? <span className="font-normal text-muted"> (ти)</span> : null}
                </p>
                <p className="truncate text-sm text-ink-2">{member.email}</p>
              </div>
              <span className="text-sm text-ink-2">{ROLE_LABELS[member.role]}</span>
              {removable ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
                      Премахни
                    </Button>
                  }
                  title="Премахни служител"
                  description={`${member.name} няма да има достъп до дилърския панел. Обявите остават към дилъра.`}
                  confirmLabel="Премахни"
                  onConfirm={async () => {
                    const result = await removeDealerMemberAction({ userId: member.userId });
                    setMessage(result.ok ? { tone: "success", text: `${member.name} е премахнат.` } : { tone: "danger", text: result.error });
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {canManage ? (
        <form
          noValidate
          className="flex flex-wrap items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setEmailError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await addDealerMemberAction({ email });
              if (result.ok) {
                setMessage({ tone: "success", text: "Служителят е добавен." });
                setEmail("");
                return;
              }
              setEmailError(result.fieldErrors?.email ?? result.error);
            });
          }}
        >
          <Field
            label="Добави служител по имейл"
            htmlFor="dealer-member-email"
            error={emailError}
            hint="Потребителят трябва да има профил с потвърден имейл и да не е член на друг дилър."
            className="min-w-0 flex-1 basis-64"
          >
            <Input
              id="dealer-member-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "dealer-member-email-error" : "dealer-member-email-hint"}
            />
          </Field>
          <Button type="submit" variant="secondary" pending={pending} disabled={!email.trim()} className="sm:mt-7">
            Добави
          </Button>
        </form>
      ) : null}
    </div>
  );
}
