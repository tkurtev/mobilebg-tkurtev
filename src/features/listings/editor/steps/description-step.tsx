"use client";

import { useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/field";
import type { ListingValues } from "../../editor";
import { EditorField, StepSection } from "../editor-fields";
import type { Issues } from "../types";

export function DescriptionStep({ issues }: { issues: Issues }) {
  const form = useFormContext<ListingValues>();
  const length = form.watch("description")?.length ?? 0;
  return (
    <StepSection title="Описание">
      <EditorField
        id="description"
        label="Описание"
        required
        error={issues.description}
        hint={`${length} / 5000 символа. Опиши състояние, обслужване, забележки и какво е включено в цената.`}
      >
        <Textarea id="description" rows={10} maxLength={5000} aria-invalid={Boolean(issues.description)} {...form.register("description")} />
      </EditorField>
    </StepSection>
  );
}
