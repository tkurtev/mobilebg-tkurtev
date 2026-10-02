"use client";

import { useFormContext } from "react-hook-form";
import { usesCore, coreRequired, type AttributeSet } from "@/config/attribute-sets";
import { Input, Select } from "@/components/ui/field";
import type { GenerationOption, MakeOption, ModelOption } from "@/features/catalog/queries";
import type { ListingValues } from "../../editor";
import { EditorField, StepSection, emptyToNull } from "../editor-fields";
import type { Issues } from "../types";

type VehicleStepProps = {
  set: AttributeSet;
  makes: MakeOption[];
  models: ModelOption[];
  generations: GenerationOption[];
  issues: Issues;
};

export function VehicleStep({ set, makes, models, generations, issues }: VehicleStepProps) {
  const form = useFormContext<ListingValues>();
  const makeId = form.watch("makeId");
  const modelId = form.watch("modelId");
  const hasTaxonomy = usesCore(set, "make");

  const autoTitle = (nextMakeId: string | null | undefined, nextModelId: string | null | undefined) => {
    const make = makes.find((candidate) => candidate.id === nextMakeId)?.name;
    const model = models.find((candidate) => candidate.id === nextModelId)?.name;
    return [make, model].filter(Boolean).join(" ");
  };

  // Keeps the "Make Model" prefix of the title in sync while preserving the modification text the seller typed.
  const syncTitle = (nextMakeId: string | null | undefined, nextModelId: string | null | undefined) => {
    const current = form.getValues("title")?.trim() ?? "";
    const previousAuto = autoTitle(form.getValues("makeId"), form.getValues("modelId"));
    const nextAuto = autoTitle(nextMakeId, nextModelId);
    if (!current || current === previousAuto) form.setValue("title", nextAuto, { shouldDirty: true });
    else if (previousAuto && current.startsWith(`${previousAuto} `)) form.setValue("title", `${nextAuto}${current.slice(previousAuto.length)}`, { shouldDirty: true });
  };

  return (
    <StepSection
      title={hasTaxonomy ? "Марка и модел" : "Заглавие"}
      description={hasTaxonomy ? "Избери марка и модел, след това допълни заглавието с модификацията." : undefined}
    >
      {hasTaxonomy ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <EditorField id="makeId" label={set.key === "parts" ? "За марка" : "Марка"} required={coreRequired(set, "make")} error={issues.makeId}>
            <Select
              id="makeId"
              value={makeId ?? ""}
              aria-invalid={Boolean(issues.makeId)}
              onChange={(event) => {
                const next = emptyToNull(event.target.value);
                syncTitle(next, null);
                form.setValue("makeId", next, { shouldDirty: true });
                form.setValue("modelId", null, { shouldDirty: true });
                form.setValue("generationId", null, { shouldDirty: true });
              }}
            >
              <option value="">Избери марка</option>
              {makes.map((make) => (
                <option key={make.id} value={make.id}>
                  {make.name}
                </option>
              ))}
            </Select>
          </EditorField>
          <EditorField id="modelId" label={set.key === "parts" ? "За модел" : "Модел"} required={coreRequired(set, "model")} error={issues.modelId}>
            <Select
              id="modelId"
              value={modelId ?? ""}
              disabled={!makeId || models.length === 0}
              aria-invalid={Boolean(issues.modelId)}
              onChange={(event) => {
                const next = emptyToNull(event.target.value);
                syncTitle(makeId, next);
                form.setValue("modelId", next, { shouldDirty: true });
                form.setValue("generationId", null, { shouldDirty: true });
              }}
            >
              <option value="">{makeId ? "Избери модел" : "Първо избери марка"}</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </Select>
          </EditorField>
          {usesCore(set, "generation") && generations.length > 0 ? (
            <EditorField id="generationId" label="Поколение" error={issues.generationId}>
              <Select id="generationId" value={form.watch("generationId") ?? ""} onChange={(event) => form.setValue("generationId", emptyToNull(event.target.value), { shouldDirty: true })}>
                <option value="">Не е избрано</option>
                {generations.map((generation) => (
                  <option key={generation.id} value={generation.id}>
                    {generation.name} ({generation.yearFrom}
                    {generation.yearTo ? `-${generation.yearTo}` : "+"})
                  </option>
                ))}
              </Select>
            </EditorField>
          ) : null}
        </div>
      ) : null}
      <EditorField
        id="title"
        label="Заглавие"
        required
        error={issues.title}
        hint={hasTaxonomy ? "Например: BMW 3 Series 320d xDrive M Sport" : "Например: 4 бр. зимни гуми Michelin 205/55 R16"}
      >
        <Input id="title" maxLength={120} aria-invalid={Boolean(issues.title)} {...form.register("title")} />
      </EditorField>
    </StepSection>
  );
}
