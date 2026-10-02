"use client";

import { useFormContext } from "react-hook-form";
import { Checkbox, Input } from "@/components/ui/field";
import { formatPrice } from "@/lib/money";
import type { ListingValues } from "../../editor";
import { EditorField, StepSection, numberOrNull } from "../editor-fields";
import type { Issues } from "../types";

export function PriceStep({ issues }: { issues: Issues }) {
  const form = useFormContext<ListingValues>();
  const price = form.watch("priceEuros");
  return (
    <StepSection title="Цена" description="Всички цени в MobiTed са в евро.">
      <div className="grid gap-4 sm:max-w-sm">
        <EditorField
          id="priceEuros"
          label="Цена (€)"
          required
          error={issues.priceEuros}
          hint={typeof price === "number" && Number.isFinite(price) && price > 0 ? `Ще се показва като ${formatPrice(price * 100)}` : undefined}
        >
          <Input
            id="priceEuros"
            inputMode="numeric"
            placeholder="например 18900"
            aria-invalid={Boolean(issues.priceEuros)}
            {...form.register("priceEuros", { setValueAs: numberOrNull })}
            defaultValue={form.getValues("priceEuros") ?? ""}
          />
        </EditorField>
        <Checkbox label="Цената подлежи на договаряне" {...form.register("priceNegotiable")} />
      </div>
    </StepSection>
  );
}
