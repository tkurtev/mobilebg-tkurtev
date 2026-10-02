"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import type { PromotionType } from "@/config/promotions";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { formatDate } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { checkoutAction } from "../actions";
import { cardFormSchema, digitsOnly, formatCardNumber, formatExpiryInput, type CardFormValues } from "../card-validation";
import { shortReference } from "../labels";
import type { CheckoutResult } from "../types";

type CheckoutFormProps = {
  listingId: string;
  listingTitle: string;
  promotionType: PromotionType;
  productName: string;
  amountCents: number;
  /** Order summary rendered next to the form; hidden once the payment succeeded. */
  summary: ReactNode;
};

const EMPTY: CardFormValues = { cardholderName: "", cardNumber: "", expiry: "", cvc: "" };

export function CheckoutForm({ listingId, listingTitle, promotionType, productName, amountCents, summary }: CheckoutFormProps) {
  const [schema] = useState(() => cardFormSchema());
  const form = useForm<CardFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY, mode: "onTouched" });
  const { errors, isSubmitting } = form.formState;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CheckoutResult | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (success) successHeading.current?.focus();
  }, [success]);

  const onSubmit = form.handleSubmit(async () => {
    setError(null);
    try {
      // Card values never leave the browser: the server only learns the listing and the package.
      const result = await checkoutAction({ listingId, promotionType });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset(EMPTY);
      setSuccess(result.data);
    } catch {
      setError("Връзката прекъсна. Провери плащанията си, преди да опиташ отново.");
    }
  });

  if (success) {
    return (
      <Panel data-testid="payment-success" aria-labelledby="payment-success-heading" className="mt-4 max-w-2xl">
        <PanelBody className="py-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="payment-success-heading" ref={successHeading} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
                Плащането е успешно
              </h2>
              <p className="mt-1 text-[15px] text-ink-2">
                {success.promotionType === "REFRESH" ? (
                  <>„{listingTitle}“ е преместена най-отгоре при подреждане по най-нови.</>
                ) : (
                  <>
                    {productName} за „{listingTitle}“ е активна до <strong className="font-semibold text-ink">{formatDate(new Date(success.endsAt))}</strong>.
                  </>
                )}
              </p>
              <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted">Сума</dt>
                <dd className="tabular">{formatPrice(success.amountCents)}</dd>
                <dt className="text-muted">Референция</dt>
                <dd className="font-mono tabular">DEMO-{shortReference(success.reference)}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={success.listingPath}>Към обявата</ButtonLink>
            <ButtonLink href="/profil/obiavi" variant="secondary">
              Моите обяви
            </ButtonLink>
          </div>
        </PanelBody>
      </Panel>
    );
  }

  const describedBy = (id: string, hasError: boolean) => (hasError ? `${id}-error` : undefined);

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="lg:order-2">{summary}</div>
      <Panel className="min-w-0 lg:order-1">
        <PanelHeader title="Данни на картата" />
        <PanelBody>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="Име на картодържателя" htmlFor="card-name" error={errors.cardholderName?.message}>
              <Input
                id="card-name"
                data-testid="card-name"
                autoComplete="cc-name"
                autoCapitalize="words"
                spellCheck={false}
                aria-invalid={Boolean(errors.cardholderName)}
                aria-describedby={describedBy("card-name", Boolean(errors.cardholderName))}
                {...form.register("cardholderName")}
              />
            </Field>
            <Controller
              control={form.control}
              name="cardNumber"
              render={({ field, fieldState }) => (
                <Field label="Номер на картата" htmlFor="card-number" error={fieldState.error?.message}>
                  <Input
                    id="card-number"
                    data-testid="card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    maxLength={23}
                    className="tabular"
                    aria-invalid={Boolean(fieldState.error)}
                    aria-describedby={describedBy("card-number", Boolean(fieldState.error))}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(formatCardNumber(event.target.value))}
                  />
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={form.control}
                name="expiry"
                render={({ field, fieldState }) => (
                  <Field label="Валидност" htmlFor="card-expiry" error={fieldState.error?.message}>
                    <Input
                      id="card-expiry"
                      data-testid="card-expiry"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="ММ/ГГ"
                      maxLength={7}
                      className="tabular"
                      aria-invalid={Boolean(fieldState.error)}
                      aria-describedby={describedBy("card-expiry", Boolean(fieldState.error))}
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(formatExpiryInput(event.target.value))}
                    />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="cvc"
                render={({ field, fieldState }) => (
                  <Field label="CVC" htmlFor="card-cvc" error={fieldState.error?.message}>
                    <Input
                      id="card-cvc"
                      data-testid="card-cvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      maxLength={4}
                      className="tabular"
                      aria-invalid={Boolean(fieldState.error)}
                      aria-describedby={describedBy("card-cvc", Boolean(fieldState.error))}
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(digitsOnly(event.target.value).slice(0, 4))}
                    />
                  </Field>
                )}
              />
            </div>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <Button type="submit" size="lg" className="w-full" pending={isSubmitting} data-testid="pay-submit">
              Плати {formatPrice(amountCents)}
            </Button>
          </form>
        </PanelBody>
      </Panel>
    </div>
  );
}
