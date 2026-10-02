"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { deleteSavedSearch, renameSavedSearch, setSavedSearchActive } from "../actions";

export function SavedSearchActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="mr-2 flex cursor-pointer items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={active}
          disabled={pending}
          onChange={(event) =>
            startTransition(async () => {
              await setSavedSearchActive({ id, active: event.target.checked });
              router.refresh();
            })
          }
          className="size-4 accent-brand"
        />
        Активно
      </label>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Преименувай
          </Button>
        </DialogTrigger>
        <DialogContent title="Преименувай търсенето">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await renameSavedSearch({ id, name: value });
                if (result.ok) {
                  setRenameOpen(false);
                  router.refresh();
                } else setError(result.fieldErrors?.name ?? result.error);
              });
            }}
          >
            <Field label="Име" htmlFor={`rename-${id}`} error={error}>
              <Input id={`rename-${id}`} value={value} onChange={(event) => setValue(event.target.value)} maxLength={80} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRenameOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" pending={pending}>
                Запази
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
            Изтрий
          </Button>
        }
        title="Изтриване на търсене"
        description={`Търсенето „${name}“ ще бъде изтрито.`}
        confirmLabel="Изтрий"
        onConfirm={async () => {
          const result = await deleteSavedSearch(id);
          if (result.ok) router.refresh();
          return result.ok;
        }}
      />
    </div>
  );
}
