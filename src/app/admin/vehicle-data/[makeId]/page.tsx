import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusLabel } from "@/components/ui/status-label";
import { VEHICLE_TYPES, type VehicleType } from "@/config/categories";
import { SectionHeading } from "@/features/admin/components/admin-table";
import {
  ActiveToggle,
  CreateGenerationForm,
  CreateModelForm,
  DeleteGenerationButton,
  EditGenerationDialog,
  EditMakeDialog,
  EditModelDialog,
} from "@/features/admin/components/taxonomy-controls";
import { getMakeWithModels, type AdminModelRow } from "@/features/admin/queries/taxonomy";
import { formatCount } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Марка" };

function typeLabel(value: string): string {
  return VEHICLE_TYPES.find((type) => type.value === value)?.label ?? value;
}

function ModelItem({ model }: { model: AdminModelRow }) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-medium">{model.name}</span>
        <span className="text-sm text-muted">{model.slug}</span>
        <span className="text-sm text-ink-2">{formatCount(model.listingCount, "обява", "обяви")}</span>
        <StatusLabel tone={model.isActive ? "success" : "muted"}>{model.isActive ? "Активен" : "Неактивен"}</StatusLabel>
        <div className="flex items-center gap-4 sm:ml-auto">
          <EditModelDialog id={model.id} name={model.name} slug={model.slug} />
          <ActiveToggle kind="model" id={model.id} isActive={model.isActive} label={model.name} />
        </div>
      </div>
      <details className="mt-1.5">
        <summary className="cursor-pointer text-sm text-brand select-none hover:underline">Поколения ({model.generations.length})</summary>
        <div className="mt-2 space-y-3 border-l-2 border-line pl-3">
          {model.generations.length === 0 ? (
            <p className="text-sm text-muted">Няма поколения.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {model.generations.map((generation) => (
                <li key={generation.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5">
                  <span className="font-medium">{generation.name}</span>
                  <span className="text-ink-2 tabular">
                    {generation.yearFrom} - {generation.yearTo ?? "сега"}
                  </span>
                  <span className="text-muted">{formatCount(generation.listingCount, "обява", "обяви")}</span>
                  <div className="flex items-center gap-4 sm:ml-auto">
                    <EditGenerationDialog id={generation.id} name={generation.name} yearFrom={generation.yearFrom} yearTo={generation.yearTo} />
                    <DeleteGenerationButton id={generation.id} name={generation.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <CreateGenerationForm modelId={model.id} />
        </div>
      </details>
    </li>
  );
}

export default async function AdminMakePage(props: PageProps<"/admin/vehicle-data/[makeId]">) {
  const { makeId } = await props.params;
  await requirePermission("taxonomy.manage", `/admin/vehicle-data/${makeId}`);
  if (!UUID.test(makeId)) notFound();
  const detail = await getMakeWithModels(makeId);
  if (!detail) notFound();
  const { make, models } = detail;

  const groups = [...new Set(models.map((model) => model.vehicleType))]
    .sort((a, b) => VEHICLE_TYPES.findIndex((type) => type.value === a) - VEHICLE_TYPES.findIndex((type) => type.value === b))
    .map((vehicleType) => ({ vehicleType, models: models.filter((model) => model.vehicleType === vehicleType) }));
  const defaultVehicleType = (groups[0]?.vehicleType ?? "car") as VehicleType;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Администрация", href: "/admin" },
          { label: "Марки и модели", href: "/admin/vehicle-data" },
          { label: make.name },
        ]}
      />
      <div className="mt-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{make.name}</h1>
        <span className="text-sm text-muted">{make.slug}</span>
        <StatusLabel tone={make.isActive ? "success" : "muted"}>{make.isActive ? "Активна" : "Неактивна"}</StatusLabel>
        <div className="flex items-center gap-4">
          <EditMakeDialog id={make.id} name={make.name} slug={make.slug} />
          <ActiveToggle kind="make" id={make.id} isActive={make.isActive} label={make.name} />
        </div>
      </div>

      <div className="mb-6">
        <CreateModelForm makeId={make.id} defaultVehicleType={defaultVehicleType} />
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-muted">Марката няма модели.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.vehicleType} aria-labelledby={`type-${group.vehicleType}`}>
              <SectionHeading id={`type-${group.vehicleType}`}>
                {typeLabel(group.vehicleType)} ({group.models.length})
              </SectionHeading>
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {group.models.map((model) => (
                  <ModelItem key={model.id} model={model} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
