"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { CityOption, RegionOption } from "@/features/catalog/queries";
import { setDealerStatusAction, updateDealerAction } from "../actions/dealers";
import { dealerUpdateSchema, type DealerUpdateInput } from "../schemas";
import { useAdminAction } from "./use-admin-action";

export function DealerForm({ defaults, regions, cities }: { defaults: DealerUpdateInput; regions: RegionOption[]; cities: CityOption[] }) {
  const form = useForm<DealerUpdateInput>({ resolver: zodResolver(dealerUpdateSchema), defaultValues: defaults });
  const { pending, formError, fieldErrors, run } = useAdminAction();
  const [saved, setSaved] = useState(false);
  const regionId = useWatch({ control: form.control, name: "regionId" });
  const regionCities = cities.filter((city) => city.regionId === regionId);
  const errorFor = (key: keyof DealerUpdateInput) => form.formState.errors[key]?.message ?? fieldErrors[key];

  const onSubmit = form.handleSubmit((values) => {
    setSaved(false);
    void run(() => updateDealerAction(values), () => {
      setSaved(true);
      form.reset(values);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      {saved ? <Alert tone="success">Промените са запазени.</Alert> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Име" htmlFor="dealer-name" required error={errorFor("name")}>
          <Input id="dealer-name" aria-invalid={Boolean(errorFor("name"))} {...form.register("name")} />
        </Field>
        <Field label="Телефон" htmlFor="dealer-phone" required error={errorFor("phone")}>
          <Input id="dealer-phone" type="tel" inputMode="tel" aria-invalid={Boolean(errorFor("phone"))} {...form.register("phone")} />
        </Field>
        <Field label="Имейл" htmlFor="dealer-email" error={errorFor("email")}>
          <Input id="dealer-email" type="email" aria-invalid={Boolean(errorFor("email"))} {...form.register("email")} />
        </Field>
        <Field label="Уебсайт" htmlFor="dealer-website" error={errorFor("website")}>
          <Input id="dealer-website" type="url" placeholder="https://" aria-invalid={Boolean(errorFor("website"))} {...form.register("website")} />
        </Field>
        <Field label="Област" htmlFor="dealer-region" error={errorFor("regionId")}>
          <Select
            id="dealer-region"
            aria-invalid={Boolean(errorFor("regionId"))}
            {...form.register("regionId", { onChange: () => form.setValue("cityId", "") })}
          >
            <option value="">Не е избрана</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Град" htmlFor="dealer-city" error={errorFor("cityId")}>
          <Select id="dealer-city" disabled={!regionId} aria-invalid={Boolean(errorFor("cityId"))} {...form.register("cityId")}>
            <option value="">Не е избран</option>
            {regionCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Адрес" htmlFor="dealer-address" error={errorFor("address")} className="sm:col-span-2">
          <Input id="dealer-address" aria-invalid={Boolean(errorFor("address"))} {...form.register("address")} />
        </Field>
        <Field label="Описание" htmlFor="dealer-description" error={errorFor("description")} className="sm:col-span-2">
          <Textarea id="dealer-description" rows={5} aria-invalid={Boolean(errorFor("description"))} {...form.register("description")} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" pending={pending} disabled={!form.formState.isDirty}>
          Запази промените
        </Button>
      </div>
    </form>
  );
}

export function DealerStatusButton({ dealerId, dealerName, status }: { dealerId: string; dealerName: string; status: "ACTIVE" | "SUSPENDED" }) {
  const { error, run, reset } = useAdminAction();
  const suspending = status === "ACTIVE";
  return (
    <ConfirmDialog
      trigger={
        <Button variant={suspending ? "danger" : "secondary"} onClick={reset}>
          {suspending ? "Спри дилъра" : "Възстанови дилъра"}
        </Button>
      }
      title={suspending ? `Спиране на ${dealerName}` : `Възстановяване на ${dealerName}`}
      confirmLabel={suspending ? "Спри дилъра" : "Възстанови"}
      tone={suspending ? "danger" : "primary"}
      onConfirm={() => run(() => setDealerStatusAction({ dealerId, status: suspending ? "SUSPENDED" : "ACTIVE" }))}
    >
      <div className="space-y-3 text-sm text-ink-2">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <p>
          {suspending
            ? "Профилът на дилъра се скрива от сайта, а служителите губят достъп до дилърския панел. Обявите не се изтриват."
            : "Профилът на дилъра става видим отново и служителите си връщат достъпа до дилърския панел."}
        </p>
      </div>
    </ConfirmDialog>
  );
}
