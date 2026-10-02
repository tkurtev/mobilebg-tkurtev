"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { CityOption, RegionOption } from "@/features/catalog/queries";
import { updateProfileAction } from "../actions";
import { profileSchema, type ProfileInput } from "../schemas";

export function ProfileForm({ defaults, email, regions, cities }: { defaults: ProfileInput; email: string; regions: RegionOption[]; cities: CityOption[] }) {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const regionId = useWatch({ control: form.control, name: "regionId" });
  const cityId = useWatch({ control: form.control, name: "cityId" });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setResult(null);
        const response = await updateProfileAction(values);
        if (response.ok) {
          setResult({ ok: true, message: "Профилът е запазен." });
          router.refresh();
        } else {
          for (const [key, message] of Object.entries(response.fieldErrors ?? {})) form.setError(key as keyof ProfileInput, { message });
          setResult({ ok: false, message: response.error });
        }
      })}
    >
      {result ? <Alert tone={result.ok ? "success" : "danger"}>{result.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Име" htmlFor="profile-name" error={errors.name?.message}>
          <Input id="profile-name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
        </Field>
        <Field label="Имейл" htmlFor="profile-email" hint="Имейлът не се показва публично.">
          <Input id="profile-email" value={email} disabled readOnly />
        </Field>
        <Field label="Телефон" htmlFor="profile-phone" error={errors.phone?.message} hint="Използва се по подразбиране в новите обяви.">
          <Input id="profile-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} {...form.register("phone")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Област" htmlFor="profile-region">
            <Select
              id="profile-region"
              value={regionId ?? ""}
              onChange={(event) => {
                form.setValue("regionId", event.target.value || null);
                form.setValue("cityId", null);
              }}
            >
              <option value="">Избери</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Град" htmlFor="profile-city" error={errors.cityId?.message}>
            <Select id="profile-city" value={cityId ?? ""} disabled={!regionId} onChange={(event) => form.setValue("cityId", event.target.value || null)}>
              <option value="">Избери</option>
              {cities
                .filter((city) => city.regionId === regionId)
                .map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      </div>
      <Button type="submit" pending={isSubmitting}>
        Запази
      </Button>
    </form>
  );
}
