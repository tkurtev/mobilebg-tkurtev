"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { getAttributeSet } from "@/config/attribute-sets";
import { LISTING_STATUS_LABELS, type ListingStatus } from "@/config/listing-status";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import type { GenerationOption, ModelOption } from "@/features/catalog/queries";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { changeDraftCategoryAction, publishListingAction, saveListingAction } from "../actions";
import { listingIssues, STEP_FIELDS, stepsForSet, type ListingValues, type StepKey } from "../editor";
import { ContactStep } from "./steps/contact-step";
import { DescriptionStep } from "./steps/description-step";
import { DetailsStep } from "./steps/details-step";
import { FeaturesStep } from "./steps/features-step";
import { LocationStep } from "./steps/location-step";
import { PhotosStep } from "./steps/photos-step";
import { PriceStep } from "./steps/price-step";
import { ReviewStep } from "./steps/review-step";
import { VehicleStep } from "./steps/vehicle-step";
import type { EditorProps, Issues } from "./types";

type SaveState = { status: "idle" | "saving" | "saved" | "error"; at?: string; message?: string };

function pickStepValues(values: ListingValues, step: StepKey): ListingValues {
  const picked: Record<string, unknown> = {};
  for (const key of STEP_FIELDS[step]) {
    const value = values[key];
    picked[key] = typeof value === "number" && Number.isNaN(value) ? null : value;
  }
  return picked as ListingValues;
}

function invalidNumbers(values: ListingValues, step: StepKey): Issues {
  const issues: Issues = {};
  for (const key of STEP_FIELDS[step]) {
    const value = values[key];
    if (typeof value === "number" && Number.isNaN(value)) issues[key] = "Въведи число.";
  }
  if (step === "details") {
    for (const [key, value] of Object.entries(values.attributes ?? {})) {
      if (typeof value === "number" && Number.isNaN(value)) issues[`attributes.${key}`] = "Въведи число.";
    }
  }
  return issues;
}

export function ListingEditor(props: EditorProps) {
  const router = useRouter();
  const { listing, category } = props;
  const set = getAttributeSet(category.attributeSet);
  const steps = useMemo(() => stepsForSet(set), [set]);
  const isDraft = listing.status === "DRAFT";
  const canPublish = isDraft || listing.status === "REJECTED";
  const form = useForm<ListingValues>({ defaultValues: props.initialValues });
  const [step, setStep] = useState<StepKey>(props.initialStep);
  const [images, setImages] = useState(props.images);
  const [issues, setIssues] = useState<Issues>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [maxReached, setMaxReached] = useState(() => (isDraft ? Math.max(steps.findIndex((entry) => entry.key === props.initialStep), Math.min(listing.draftStep - 1, steps.length - 1)) : steps.length - 1));
  const [published, setPublished] = useState<{ status: string; path: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, startPublish] = useTransition();
  const [categoryPending, startCategory] = useTransition();
  const [taxonomy, setTaxonomy] = useState<{ makeId: string | null; models: ModelOption[]; modelId: string | null; generations: GenerationOption[] }>({
    makeId: props.initialValues.makeId ?? null,
    models: props.models,
    modelId: props.initialValues.modelId ?? null,
    generations: props.generations,
  });
  const autosaveTimer = useRef<number | undefined>(undefined);

  const stepIndex = Math.max(0, steps.findIndex((entry) => entry.key === step));
  const makeId = form.watch("makeId") ?? null;
  const modelId = form.watch("modelId") ?? null;

  useEffect(() => {
    if (!makeId || !category.vehicleType || taxonomy.makeId === makeId) return;
    const controller = new AbortController();
    fetch(`/api/catalog/models?makeId=${makeId}&vehicleType=${category.vehicleType}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((models: ModelOption[]) => setTaxonomy((current) => ({ ...current, makeId, models })))
      .catch(() => {});
    return () => controller.abort();
  }, [makeId, category.vehicleType, taxonomy.makeId]);

  useEffect(() => {
    if (!modelId || taxonomy.modelId === modelId) return;
    const controller = new AbortController();
    fetch(`/api/catalog/generations?modelId=${modelId}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((generations: GenerationOption[]) => setTaxonomy((current) => ({ ...current, modelId, generations })))
      .catch(() => {});
    return () => controller.abort();
  }, [modelId, taxonomy.modelId]);

  const models = taxonomy.makeId === makeId ? taxonomy.models : [];
  const generations = taxonomy.modelId === modelId ? taxonomy.generations : [];

  const save = useCallback(
    async (target: StepKey, complete: boolean): Promise<boolean> => {
      if (target === "category" || target === "photos" || target === "review") return true;
      const values = form.getValues();
      const numberIssues = invalidNumbers(values, target);
      const stepIssues = complete ? { ...listingIssues(values, category.attributeSet, { step: target }), ...numberIssues } : numberIssues;
      if (complete && Object.keys(stepIssues).length > 0) {
        setIssues(stepIssues);
        return false;
      }
      setSaveState({ status: "saving" });
      const result = await saveListingAction({ listingId: listing.id, step: target, complete, values: pickStepValues(values, target) });
      if (!result.ok) {
        if (complete || result.fieldErrors) setIssues(result.fieldErrors ?? {});
        setSaveState({ status: "error", message: result.error });
        return false;
      }
      setSaveState({ status: "saved", at: result.data.savedAt });
      if (complete) setIssues({});
      return true;
    },
    [form, category.attributeSet, listing.id],
  );

  useEffect(() => {
    if (!isDraft) return;
    const subscription = form.watch(() => {
      window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => void save(step, false), 1200);
    });
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(autosaveTimer.current);
    };
  }, [form, isDraft, save, step]);

  useEffect(() => {
    if (isDraft) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (form.formState.isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [form, isDraft]);

  function goTo(target: StepKey) {
    window.clearTimeout(autosaveTimer.current);
    setIssues({});
    setStep(target);
    const index = steps.findIndex((entry) => entry.key === target);
    setMaxReached((current) => Math.max(current, index));
    window.history.replaceState(null, "", `?stap=${target}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function next() {
    if (step === "photos" && images.length === 0) {
      setIssues({ photos: "Добави поне една снимка." });
      return;
    }
    const ok = await save(step, true);
    if (!ok) return;
    if (!isDraft) form.reset(form.getValues());
    const following = steps[stepIndex + 1];
    if (following) goTo(following.key);
  }

  async function back() {
    if (isDraft) void save(step, false);
    else if (form.formState.isDirty && !(await save(step, true))) return;
    const previous = steps[stepIndex - 1];
    if (previous) goTo(previous.key);
  }

  const issuesByStep = steps
    .filter((entry) => entry.key !== "review" && entry.key !== "category")
    .map((entry) => ({ step: entry.key, label: entry.label, issues: listingIssues(form.getValues(), category.attributeSet, { step: entry.key, imageCount: images.length }) }));
  const ready = issuesByStep.every((entry) => Object.keys(entry.issues).length === 0);

  function publish() {
    setPublishError(null);
    startPublish(async () => {
      const saved = await save(steps[stepIndex]?.key ?? "review", false);
      if (!saved) return;
      const result = await publishListingAction(listing.id);
      if (result.ok) {
        setPublished(result.data);
        router.refresh();
      } else setPublishError(result.error);
    });
  }

  if (published) {
    const pending = published.status === "PENDING";
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-line bg-surface p-6" data-testid="publish-success">
        <h1 className="text-xl font-semibold">{pending ? "Обявата е изпратена за преглед" : "Обявата е публикувана"}</h1>
        <p className="mt-2 text-ink-2">{pending ? "Ще бъде видима след одобрение от модератор. Ще получиш известие." : "Обявата вече се вижда в търсенето."}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {!pending ? <ButtonLink href={published.path}>Виж обявата</ButtonLink> : null}
          {!pending ? (
            <ButtonLink href={`/profil/obiavi/${listing.id}/promotirane`} variant="secondary">
              Промотирай
            </ButtonLink>
          ) : null}
          <ButtonLink href="/profil/obiavi" variant="secondary">
            Моите обяви
          </ButtonLink>
        </div>
      </div>
    );
  }

  const stepContent = () => {
    switch (step) {
      case "category":
        return (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Категория</h2>
            {isDraft ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {props.categories.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      disabled={categoryPending}
                      onClick={() =>
                        candidate.id === category.id
                          ? goTo(steps[1]?.key ?? "vehicle")
                          : startCategory(async () => {
                              const result = await changeDraftCategoryAction({ listingId: listing.id, categoryId: candidate.id });
                              if (result.ok) router.replace(`/publikuvai/${listing.id}?stap=vehicle`);
                            })
                      }
                      className={cn(
                        "flex h-full w-full items-center rounded-md border px-3 py-3 text-left text-[15px] transition-colors",
                        candidate.id === category.id ? "border-brand bg-brand-soft font-medium text-brand-ink" : "border-line bg-surface hover:border-line-strong",
                      )}
                    >
                      {candidate.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-2">
                {category.name}. Категорията на публикувана обява не може да се сменя.
              </p>
            )}
          </section>
        );
      case "vehicle":
        return <VehicleStep set={set} makes={props.makes} models={models} generations={generations} issues={issues} />;
      case "details":
        return <DetailsStep set={set} issues={issues} />;
      case "features":
        return <FeaturesStep groups={set.featureGroups} />;
      case "price":
        return <PriceStep issues={issues} />;
      case "photos":
        return <PhotosStep listingId={listing.id} images={images} setImages={setImages} maxImages={props.maxImages} error={issues.photos} />;
      case "description":
        return <DescriptionStep issues={issues} />;
      case "location":
        return <LocationStep regions={props.regions} cities={props.cities} issues={issues} />;
      case "contact":
        return <ContactStep issues={issues} isDealer={props.isDealerListing} />;
      case "review":
        return (
          <ReviewStep
            attributeSet={category.attributeSet}
            images={images}
            issuesByStep={issuesByStep}
            onGoTo={goTo}
            categoryName={category.name}
            lookups={{ makes: props.makes, models, generations, regions: props.regions, cities: props.cities }}
          />
        );
    }
  };

  return (
    <FormProvider {...form}>
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <ol className="space-y-0.5" aria-label="Стъпки">
            {steps.map((entry, index) => {
              const reachable = index <= maxReached;
              const done = index < stepIndex || (!isDraft && index !== stepIndex);
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={async () => {
                      if (entry.key === step) return;
                      if (isDraft) void save(step, false);
                      else if (form.formState.isDirty && !(await save(step, true))) return;
                      goTo(entry.key);
                    }}
                    aria-current={entry.key === step ? "step" : undefined}
                    className={cn(
                      "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[15px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      entry.key === step ? "bg-brand-soft font-medium text-brand-ink" : "text-ink-2 hover:bg-subtle hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular",
                        entry.key === step ? "border-brand bg-brand text-white" : done && reachable ? "border-brand text-brand" : "border-line-strong",
                      )}
                    >
                      {done && reachable && entry.key !== step ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                    </span>
                    {entry.label}
                  </button>
                </li>
              );
            })}
            <li className="pt-1">
              <span className="flex h-10 items-center gap-3 px-3 text-[15px] text-muted">
                <span className="flex size-6 items-center justify-center rounded-full border border-line-strong text-xs tabular">{steps.length + 1}</span>
                Публикуване
              </span>
            </li>
          </ol>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 lg:hidden">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                Стъпка {stepIndex + 1} от {steps.length}: {steps[stepIndex]?.label}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
              <div className="h-full bg-brand transition-[width]" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
            </div>
          </div>

          {listing.status === "REJECTED" && listing.rejectionReason ? (
            <Alert tone="danger" title="Обявата е отказана" className="mb-4">
              {listing.rejectionReason} Поправи данните и я изпрати отново за преглед.
            </Alert>
          ) : null}
          {!isDraft && listing.status !== "REJECTED" ? (
            <Alert tone="info" className="mb-4">
              Редактираш обява със статус „{LISTING_STATUS_LABELS[listing.status as ListingStatus] ?? listing.status}“. Промените се запазват при преминаване към друга стъпка.{" "}
              <Link href={listing.publicPath} className="font-medium underline">
                Виж обявата
              </Link>
            </Alert>
          ) : null}

          <div className="rounded-lg border border-line bg-surface p-4 sm:p-6">
            <form onSubmit={(event) => event.preventDefault()} noValidate>
              {stepContent()}
            </form>
          </div>

          {publishError ? (
            <Alert tone="danger" className="mt-4">
              {publishError}
            </Alert>
          ) : null}

          <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex items-center gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            {stepIndex > 0 ? (
              <Button variant="secondary" onClick={() => void back()} icon={<ChevronLeft className="size-4" aria-hidden="true" />}>
                Назад
              </Button>
            ) : null}
            <p className="hidden text-sm text-muted sm:block" aria-live="polite">
              {saveState.status === "saving" ? "Запазване..." : saveState.status === "saved" && saveState.at ? `Запазено ${formatTime(new Date(saveState.at))}` : saveState.status === "error" ? <span className="text-danger">{saveState.message}</span> : null}
            </p>
            <div className="ml-auto">
              {step === "review" ? (
                canPublish ? (
                  <Button onClick={publish} pending={publishing} disabled={!ready} data-testid="publish-listing">
                    {listing.status === "REJECTED" ? "Изпрати за преглед" : "Публикувай обява"}
                  </Button>
                ) : (
                  <ButtonLink href={listing.publicPath}>Виж обявата</ButtonLink>
                )
              ) : (
                <Button onClick={() => void next()} pending={saveState.status === "saving"} data-testid="wizard-next">
                  {isDraft ? "Напред" : "Запази и продължи"}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
