"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/field";
import type { ListingValues } from "../../editor";
import { EditorField, StepSection } from "../editor-fields";
import type { Issues } from "../types";

export function ContactStep({ issues, isDealer }: { issues: Issues; isDealer: boolean }) {
  const form = useFormContext<ListingValues>();
  return (
    <StepSection
      title="Контакти"
      description="Телефонът се показва след натискане на бутон, за да се ограничи автоматичното събиране. Имейлът ти не се показва."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <EditorField id="contactName" label={isDealer ? "Лице за контакт" : "Име"} required error={issues.contactName}>
          <Input id="contactName" autoComplete="name" maxLength={80} aria-invalid={Boolean(issues.contactName)} {...form.register("contactName")} defaultValue={form.getValues("contactName") ?? ""} />
        </EditorField>
        <EditorField id="contactPhone" label="Телефон" required error={issues.contactPhone} hint="Например 0888 123 456 или +359 888 123 456">
          <Input id="contactPhone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(issues.contactPhone)} {...form.register("contactPhone")} defaultValue={form.getValues("contactPhone") ?? ""} />
        </EditorField>
      </div>
    </StepSection>
  );
}
