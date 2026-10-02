"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { MODERATION_MODE_LABELS, type AppSettings } from "@/config/settings";
import { updateSettingsAction } from "../actions/settings";
import { settingsFormSchema } from "../schemas";
import { useAdminAction } from "./use-admin-action";

const MODES = Object.keys(MODERATION_MODE_LABELS) as AppSettings["moderationMode"][];

export function SettingsForm({ defaults }: { defaults: AppSettings }) {
  const form = useForm<AppSettings>({ resolver: zodResolver(settingsFormSchema), defaultValues: defaults });
  const { pending, formError, fieldErrors, run } = useAdminAction();
  const [saved, setSaved] = useState(false);
  const errorFor = (key: keyof AppSettings) => form.formState.errors[key]?.message ?? fieldErrors[key];

  const onSubmit = form.handleSubmit((values) => {
    setSaved(false);
    void run(() => updateSettingsAction(values), () => {
      setSaved(true);
      form.reset(values);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-4">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      {saved ? <Alert tone="success">Настройките са запазени.</Alert> : null}
      <Field label="Срок на обявите (дни)" htmlFor="setting-duration" required error={errorFor("listingDurationDays")} hint="От 7 до 365 дни. Важи за нови публикации и подновявания.">
        <Input
          id="setting-duration"
          type="number"
          inputMode="numeric"
          min={7}
          max={365}
          className="sm:w-40"
          aria-invalid={Boolean(errorFor("listingDurationDays"))}
          {...form.register("listingDurationDays", { valueAsNumber: true })}
        />
      </Field>
      <Field label="Модерация" htmlFor="setting-moderation" required error={errorFor("moderationMode")}>
        <Select id="setting-moderation" aria-invalid={Boolean(errorFor("moderationMode"))} {...form.register("moderationMode")}>
          {MODES.map((mode) => (
            <option key={mode} value={mode}>
              {MODERATION_MODE_LABELS[mode]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Максимален брой снимки в обява" htmlFor="setting-images" required error={errorFor("maxImagesPerListing")} hint="От 1 до 40.">
        <Input
          id="setting-images"
          type="number"
          inputMode="numeric"
          min={1}
          max={40}
          className="sm:w-40"
          aria-invalid={Boolean(errorFor("maxImagesPerListing"))}
          {...form.register("maxImagesPerListing", { valueAsNumber: true })}
        />
      </Field>
      <div>
        <Button type="submit" pending={pending} disabled={!form.formState.isDirty}>
          Запази настройките
        </Button>
      </div>
    </form>
  );
}
