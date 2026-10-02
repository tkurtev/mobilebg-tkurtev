"use client";

import { BookmarkPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { createSavedSearch } from "../actions";

type SaveSearchButtonProps = {
  authenticated: boolean;
  categorySlug: string;
  query: string;
  suggestedName: string;
  loginHref: string;
};

export function SaveSearchButton({ authenticated, categorySlug, query, suggestedName, loginHref }: SaveSearchButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const trigger = (
    <>
      <BookmarkPlus className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Запази търсенето</span>
      <span className="sr-only sm:hidden">Запази търсенето</span>
    </>
  );

  if (!authenticated) {
    return (
      <Link href={loginHref} className={buttonClasses({ variant: "secondary", size: "sm", className: "h-9" })}>
        {trigger}
      </Link>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSaved(false);
          setError(null);
          setName(suggestedName);
        }
      }}
    >
      <DialogTrigger className={buttonClasses({ variant: "secondary", size: "sm", className: "h-9" })}>{trigger}</DialogTrigger>
      <DialogContent title="Запази търсенето">
        {saved ? (
          <div className="space-y-4">
            <Alert tone="success" title="Търсенето е запазено">
              Ще го намериш в <Link href="/profil/tarseniya" className="font-medium underline">Запазени търсения</Link>.
            </Alert>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Затвори
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await createSavedSearch({ name, categorySlug, query });
                if (result.ok) setSaved(true);
                else setError(result.fieldErrors?.name ?? result.error);
              });
            }}
          >
            <Field label="Име" htmlFor="saved-search-name" error={error}>
              <Input id="saved-search-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required aria-invalid={Boolean(error)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" pending={pending}>
                Запази
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
