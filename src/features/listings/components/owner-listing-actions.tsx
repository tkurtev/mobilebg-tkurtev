"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuButton, DropdownMenuContent, DropdownMenuLink, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, Input } from "@/components/ui/field";
import { ownerStatusAction, saveListingAction } from "../actions";
import type { OwnerAction } from "../service";

type OwnerListingActionsProps = {
  listing: { id: string; status: string; path: string; priceEuros: number | null; expired: boolean; moderationLock: boolean };
};

export function OwnerListingActions({ listing }: OwnerListingActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [priceOpen, setPriceOpen] = useState(false);
  const [price, setPrice] = useState(listing.priceEuros ? String(listing.priceEuros) : "");
  const [priceError, setPriceError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"sold" | "archive" | null>(null);

  const run = (action: OwnerAction) =>
    new Promise<boolean>((resolve) => {
      setError(null);
      startTransition(async () => {
        const result = await ownerStatusAction({ listingId: listing.id, action });
        if (!result.ok) setError(result.error);
        else router.refresh();
        resolve(result.ok);
      });
    });

  const status = listing.status;
  const canPromote = status === "ACTIVE" && !listing.expired;
  const editable = !["SOLD", "ARCHIVED"].includes(status);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {status === "DRAFT" ? (
          <Link href={`/publikuvai/${listing.id}`} className={buttonClasses({ size: "sm" })}>
            Продължи
          </Link>
        ) : editable ? (
          <Link href={`/publikuvai/${listing.id}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Редактирай
          </Link>
        ) : null}
        {canPromote ? (
          <Link href={`/profil/obiavi/${listing.id}/promotirane`} className={buttonClasses({ variant: "secondary", size: "sm", className: "hidden sm:inline-flex" })}>
            Промотирай
          </Link>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonClasses({ variant: "ghost", size: "sm", className: "w-8 px-0" })} aria-label="Още действия" disabled={pending}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {status !== "DRAFT" && status !== "ARCHIVED" ? <DropdownMenuLink href={listing.path}>Виж обявата</DropdownMenuLink> : null}
            {canPromote ? <DropdownMenuLink href={`/profil/obiavi/${listing.id}/promotirane`}>Промотирай</DropdownMenuLink> : null}
            {editable && status !== "DRAFT" ? <DropdownMenuButton onSelect={() => setPriceOpen(true)}>Промени цената</DropdownMenuButton> : null}
            {status === "ACTIVE" && !listing.expired ? <DropdownMenuButton onSelect={() => void run("pause")}>Паузирай</DropdownMenuButton> : null}
            {status === "PAUSED" && !listing.moderationLock ? <DropdownMenuButton onSelect={() => void run("resume")}>Активирай</DropdownMenuButton> : null}
            {(listing.expired || status === "EXPIRED") && !listing.moderationLock ? <DropdownMenuButton onSelect={() => void run("renew")}>Поднови</DropdownMenuButton> : null}
            {["ACTIVE", "PAUSED", "EXPIRED"].includes(status) ? <DropdownMenuButton onSelect={() => setConfirm("sold")}>Маркирай като продадена</DropdownMenuButton> : null}
            {status !== "ARCHIVED" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuButton onSelect={() => setConfirm("archive")} className="text-danger">
                  {status === "DRAFT" ? "Изтрий черновата" : "Изтрий обявата"}
                </DropdownMenuButton>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "sold" ? "Маркирай като продадена" : "Изтриване на обява"}
        description={confirm === "sold" ? "Обявата ще спре да се показва в търсенето. Действието не може да бъде отменено." : "Обявата ще бъде премахната от сайта и преместена в архива."}
        confirmLabel={confirm === "sold" ? "Продадена" : "Изтрий"}
        tone={confirm === "sold" ? "primary" : "danger"}
        onConfirm={async () => (confirm ? run(confirm) : false)}
      />

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent title="Промени цената">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const value = Number.parseInt(price.replace(/\D/g, ""), 10);
              if (!Number.isSafeInteger(value) || value < 1) {
                setPriceError("Въведи цена в евро.");
                return;
              }
              startTransition(async () => {
                const result = await saveListingAction({ listingId: listing.id, step: "price", complete: true, values: { priceEuros: value } });
                if (!result.ok) setPriceError(result.fieldErrors?.priceEuros ?? result.error);
                else {
                  setPriceOpen(false);
                  router.refresh();
                }
              });
            }}
          >
            <Field label="Нова цена (€)" htmlFor={`price-${listing.id}`} error={priceError}>
              <Input id={`price-${listing.id}`} inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} autoFocus data-testid="quick-price-input" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPriceOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" pending={pending} data-testid="quick-price-save">
                Запази
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
