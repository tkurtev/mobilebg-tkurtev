"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Label, Select, Textarea } from "@/components/ui/field";
import { ROLE_LABELS, type Role } from "@/server/auth/policies";
import { changeUserRoleAction, suspendUserAction, unsuspendUserAction } from "../actions/users";
import { useAdminAction } from "./use-admin-action";

export function UserRoleForm({ userId, currentRole, allowedRoles }: { userId: string; currentRole: Role; allowedRoles: Role[] }) {
  const [role, setRole] = useState<Role>(currentRole);
  const { error, run, reset } = useAdminAction();
  const options = allowedRoles.includes(currentRole) ? allowedRoles : [currentRole, ...allowedRoles];

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-full sm:w-60">
        <Label htmlFor="user-role">Роля</Label>
        <Select id="user-role" value={role} onChange={(event) => setRole(event.target.value as Role)} data-testid="user-role-select">
          {options.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </Select>
      </div>
      <ConfirmDialog
        trigger={
          <Button variant="secondary" disabled={role === currentRole} onClick={reset} data-testid="user-role-submit">
            Смени ролята
          </Button>
        }
        title="Смяна на роля"
        confirmLabel="Смени ролята"
        tone="primary"
        onConfirm={() => run(() => changeUserRoleAction({ userId, role }))}
      >
        <div className="space-y-3 text-sm text-ink-2">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <p>
            Ролята ще бъде сменена от „{ROLE_LABELS[currentRole]}“ на „{ROLE_LABELS[role]}“. Промяната важи веднага.
          </p>
          {role === "DEALER" ? <p>Ролята не създава дилърски профил. Дилърът се регистрира от профила на потребителя.</p> : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}

export function SuspendUserDialog({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, formError, fieldErrors, run, reset } = useAdminAction();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setReason("");
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="danger" data-testid="user-suspend">
          Спри потребителя
        </Button>
      </DialogTrigger>
      <DialogContent title={`Спиране на ${userName}`} description="Потребителят излиза от всички устройства и не може да влезе, докато не бъде възстановен.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => suspendUserAction({ userId, reason }), () => setOpen(false));
          }}
        >
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <Field label="Причина" htmlFor="suspend-reason" required error={fieldErrors.reason}>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
              rows={3}
              className="min-h-20"
              required
              minLength={3}
              aria-invalid={Boolean(fieldErrors.reason)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Отказ
            </Button>
            <Button type="submit" variant="danger" pending={pending} data-testid="user-suspend-submit">
              Спри потребителя
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UnsuspendUserButton({ userId }: { userId: string }) {
  const { error, run, reset } = useAdminAction();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" onClick={reset}>
          Възстанови потребителя
        </Button>
      }
      title="Възстановяване на потребителя"
      confirmLabel="Възстанови"
      tone="primary"
      onConfirm={() => run(() => unsuspendUserAction({ userId }))}
    >
      <div className="space-y-3 text-sm text-ink-2">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <p>Потребителят ще може да влиза отново. Обявите му не се променят.</p>
      </div>
    </ConfirmDialog>
  );
}
