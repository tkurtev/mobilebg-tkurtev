"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/field";
import { deleteAccountAction } from "../actions";

export function DeleteAccount({ email }: { email: string }) {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <ConfirmDialog
      trigger={<Button variant="danger">Изтрий профила</Button>}
      title="Изтриване на профила"
      confirmLabel="Изтрий профила"
      onConfirm={async () => {
        const result = await deleteAccountAction({ confirmEmail });
        if (!result.ok) {
          setError(result.fieldErrors?.confirmEmail ?? result.error);
          return false;
        }
        router.push("/");
        router.refresh();
        return true;
      }}
    >
      <div className="space-y-3 text-[15px] text-ink-2">
        <p>Обявите ти ще бъдат архивирани и ще излезеш от всички устройства. Въведи {email}, за да потвърдиш.</p>
        <Field label="Имейл" htmlFor="confirm-delete-email" error={error}>
          <Input id="confirm-delete-email" type="email" value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} autoComplete="off" />
        </Field>
      </div>
    </ConfirmDialog>
  );
}
