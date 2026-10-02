"use client";

import Image from "next/image";
import { useFormContext } from "react-hook-form";
import { getAttributeSet } from "@/config/attribute-sets";
import { getFeature } from "@/config/features";
import { Alert } from "@/components/ui/alert";
import type { CityOption, GenerationOption, MakeOption, ModelOption, RegionOption } from "@/features/catalog/queries";
import { formatPrice } from "@/lib/money";
import { formatBgPhone, normalizeBgPhone } from "@/lib/phone";
import type { ListingValues, StepKey } from "../../editor";
import { buildSpecRows } from "../../specs";
import { StepSection } from "../editor-fields";
import type { EditorImage, Issues } from "../types";

type ReviewStepProps = {
  attributeSet: string;
  images: EditorImage[];
  issuesByStep: { step: StepKey; label: string; issues: Issues }[];
  onGoTo: (step: StepKey) => void;
  lookups: { makes: MakeOption[]; models: ModelOption[]; generations: GenerationOption[]; regions: RegionOption[]; cities: CityOption[] };
  categoryName: string;
};

export function ReviewStep({ attributeSet, images, issuesByStep, onGoTo, lookups, categoryName }: ReviewStepProps) {
  const form = useFormContext<ListingValues>();
  const values = form.getValues();
  const set = getAttributeSet(attributeSet);
  const specs = buildSpecRows({
    attributeSet,
    makeName: lookups.makes.find((make) => make.id === values.makeId)?.name ?? null,
    modelName: lookups.models.find((model) => model.id === values.modelId)?.name ?? null,
    generationName: lookups.generations.find((generation) => generation.id === values.generationId)?.name ?? null,
    year: values.year ?? null,
    mileageKm: values.mileageKm ?? null,
    fuel: values.fuel ?? null,
    gearbox: values.gearbox ?? null,
    powerHp: values.powerHp ?? null,
    engineCc: values.engineCc ?? null,
    drivetrain: values.drivetrain ?? null,
    bodyType: values.bodyType ?? null,
    color: values.color ?? null,
    condition: values.condition ?? null,
    attributes: Object.entries(values.attributes ?? {}).map(([key, value]) => ({
      key,
      valueText: typeof value === "string" ? value : null,
      valueNumber: typeof value === "number" ? value : null,
      valueBool: typeof value === "boolean" ? value : null,
    })),
  });
  const city = lookups.cities.find((candidate) => candidate.id === values.cityId)?.name;
  const region = lookups.regions.find((candidate) => candidate.id === values.regionId)?.name;
  const phone = values.contactPhone ? normalizeBgPhone(values.contactPhone) : null;
  const features = (values.features ?? []).map((key) => getFeature(key)?.label).filter(Boolean);
  const pendingSteps = issuesByStep.filter((entry) => Object.keys(entry.issues).length > 0);

  return (
    <StepSection title="Преглед" description="Провери обявата преди публикуване.">
      {pendingSteps.length > 0 ? (
        <Alert tone="warning" title="Липсват данни">
          <ul className="mt-1 space-y-1">
            {pendingSteps.map((entry) => (
              <li key={entry.step}>
                <button type="button" className="font-medium text-brand underline-offset-2 hover:underline" onClick={() => onGoTo(entry.step)}>
                  {entry.label}
                </button>
                : {Object.values(entry.issues).join(" ")}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <article className="overflow-hidden rounded-lg border border-line bg-surface" data-testid="listing-preview">
        <div className="grid gap-4 p-4 sm:grid-cols-[240px_minmax(0,1fr)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-subtle">
            {images[0] ? <Image src={images[0].thumbUrl} alt="" fill unoptimized sizes="240px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-sm text-muted">Няма снимки</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted">{categoryName}</p>
            <h3 className="text-lg leading-snug font-semibold">{values.title || "Без заглавие"}</h3>
            <p className="mt-1 text-xl font-semibold tabular">
              {typeof values.priceEuros === "number" && values.priceEuros > 0 ? formatPrice(values.priceEuros * 100) : "Без цена"}
              {values.priceNegotiable ? <span className="ml-2 text-sm font-normal text-muted">Договаряне</span> : null}
            </p>
            <p className="mt-1 text-sm text-ink-2">{[city, region].filter(Boolean).join(", ") || "Без местоположение"}</p>
            <p className="mt-1 text-sm text-ink-2">
              {values.contactName} {phone ? `· ${formatBgPhone(phone)}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">{images.length} снимки</p>
          </div>
        </div>
        {specs.length > 0 ? (
          <dl className="grid border-t border-line sm:grid-cols-2">
            {specs.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 border-b border-line px-4 py-2 text-sm sm:odd:border-r">
                <dt className="text-muted">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {set.featureGroups.length > 0 && features.length > 0 ? <p className="border-t border-line px-4 py-3 text-sm text-ink-2">{features.join(", ")}</p> : null}
        {values.description ? <p className="border-t border-line px-4 py-3 text-sm whitespace-pre-line text-ink-2">{values.description}</p> : null}
      </article>
    </StepSection>
  );
}
