"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createDealerAction, updateDealerProfileAction } from "../actions";
import { dealerProfileSchema, type DealerProfileData, type DealerProfileInput } from "../schemas";

type Option = { id: string; name: string };
type CityOption = Option & { regionId: string };

type DealerProfileFormProps = {
  mode: "create" | "edit";
  regions: Option[];
  cities: CityOption[];
  defaultValues?: DealerProfileInput;
};

const EMPTY: DealerProfileInput = { name: "", phone: "", email: "", website: "", regionId: "", cityId: "", address: "", description: "" };

export function DealerProfileForm({ mode, regions, cities, defaultValues = EMPTY }: DealerProfileFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<DealerProfileInput, unknown, DealerProfileData>({ resolver: zodResolver(dealerProfileSchema), defaultValues });
  const { errors, isSubmitting } = form.formState;
  const regionId = useWatch({ control: form.control, name: "regionId" });
  const regionCities = cities.filter((city) => city.regionId === regionId);

  const onSubmit = form.handleSubmit(async () => {
    setError(null);
    setSaved(false);
    // The server re-validates the raw input; the parsed client values are only used for validation here.
    const values = form.getValues();
    const result = mode === "create" ? await createDealerAction(values) : await updateDealerProfileAction(values);
    if (result.ok) {
      setSaved(true);
      form.reset(values);
      return;
    }
    const fieldErrors = Object.entries(result.fieldErrors ?? {});
    for (const [key, message] of fieldErrors) {
      if (key in EMPTY) form.setError(key as keyof DealerProfileInput, { message });
    }
    setError(fieldErrors.length > 0 ? "Провери маркираните полета." : result.error);
  });

  const a11y = (key: keyof DealerProfileInput, id: string, hintId?: string) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${id}-error` : hintId,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" data-testid={mode === "create" ? "dealer-create-form" : "dealer-profile-form"}>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {saved && mode === "edit" && !form.formState.isDirty ? <Alert tone="success">Промените са запазени.</Alert> : null}

      <Field label="Име на фирмата" htmlFor="dealer-name" error={errors.name?.message} required>
        <Input id="dealer-name" autoComplete="organization" maxLength={120} {...a11y("name", "dealer-name")} {...form.register("name")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Телефон" htmlFor="dealer-phone" error={errors.phone?.message} required>
          <Input
            id="dealer-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="02 123 4567"
            {...a11y("phone", "dealer-phone")}
            {...form.register("phone")}
          />
        </Field>
        <Field label="Имейл за контакт" htmlFor="dealer-email" error={errors.email?.message}>
          <Input
            id="dealer-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            {...a11y("email", "dealer-email")}
            {...form.register("email")}
          />
        </Field>
      </div>

      <Field label="Уебсайт" htmlFor="dealer-website" error={errors.website?.message}>
        <Input
          id="dealer-website"
          type="url"
          inputMode="url"
          placeholder="https://"
          {...a11y("website", "dealer-website")}
          {...form.register("website")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Област" htmlFor="dealer-region" error={errors.regionId?.message} required>
          <Select
            id="dealer-region"
            {...a11y("regionId", "dealer-region")}
            {...form.register("regionId", {
              onChange: (event: { target: { value: string } }) => {
                const city = cities.find((option) => option.id === form.getValues("cityId"));
                if (city && city.regionId !== event.target.value) form.setValue("cityId", "");
              },
            })}
          >
            <option value="">Избери област</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Град" htmlFor="dealer-city" error={errors.cityId?.message} required>
          <Select id="dealer-city" disabled={!regionId} {...a11y("cityId", "dealer-city")} {...form.register("cityId")}>
            <option value="">{regionId ? "Избери град" : "Първо избери област"}</option>
            {regionCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Адрес" htmlFor="dealer-address" error={errors.address?.message} required>
        <Input
          id="dealer-address"
          autoComplete="street-address"
          maxLength={200}
          {...a11y("address", "dealer-address")}
          {...form.register("address")}
        />
      </Field>

      <Field label="Описание" htmlFor="dealer-description" error={errors.description?.message} hint="Какво предлагате, услуги, лизинг, гаранция. До 4000 символа.">
        <Textarea
          id="dealer-description"
          rows={6}
          maxLength={4000}
          {...a11y("description", "dealer-description", "dealer-description-hint")}
          {...form.register("description")}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" pending={isSubmitting} data-testid="dealer-profile-submit">
          {mode === "create" ? "Създай дилърски профил" : "Запази промените"}
        </Button>
      </div>
    </form>
  );
}
