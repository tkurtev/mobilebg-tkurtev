"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { VEHICLE_TYPES, type VehicleType } from "@/config/categories";
import type { ActionResult } from "@/lib/action-result";
import { slugify } from "@/lib/slug";
import {
  createGenerationAction,
  createMakeAction,
  createModelAction,
  deleteGenerationAction,
  setMakeActiveAction,
  setModelActiveAction,
  updateGenerationAction,
  updateMakeAction,
  updateModelAction,
} from "../actions/taxonomy";
import { useAdminAction } from "./use-admin-action";

function InlineError({ message }: { message: string | null | undefined }) {
  return message ? (
    <p className="mt-1.5 w-full text-sm text-danger" role="alert">
      {message}
    </p>
  ) : null;
}

export function CreateMakeForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { pending, formError, fieldErrors, run } = useAdminAction();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(() => createMakeAction({ name, slug }), () => {
      setName("");
      setSlug("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface p-3" aria-label="Нова марка">
      <Field label="Нова марка" htmlFor="make-new-name" error={fieldErrors.name} className="w-full sm:w-56">
        <Input id="make-new-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required className="h-9 text-sm" />
      </Field>
      <Field label="Адрес (по желание)" htmlFor="make-new-slug" error={fieldErrors.slug} className="w-full sm:w-48">
        <Input id="make-new-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder={slugify(name) || "bmw"} maxLength={80} className="h-9 text-sm" />
      </Field>
      <Button type="submit" size="sm" className="h-9" pending={pending}>
        Добави марка
      </Button>
      <InlineError message={formError} />
    </form>
  );
}

type NameSlugDialogProps = {
  title: string;
  idPrefix: string;
  initialName: string;
  initialSlug: string;
  slugHint: string;
  onSave: (values: { name: string; slug: string }) => Promise<ActionResult>;
};

export function NameSlugDialog({ title, idPrefix, initialName, initialSlug, slugHint, onSave }: NameSlugDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const { pending, formError, fieldErrors, run, reset } = useAdminAction();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName(initialName);
          setSlug(initialSlug);
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="link" className="text-sm">
          Преименувай
        </Button>
      </DialogTrigger>
      <DialogContent title={title}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => onSave({ name, slug }), () => setOpen(false));
          }}
        >
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <Field label="Име" htmlFor={`${idPrefix}-name`} required error={fieldErrors.name}>
            <Input id={`${idPrefix}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required />
          </Field>
          <Field label="Адрес (slug)" htmlFor={`${idPrefix}-slug`} required error={fieldErrors.slug} hint={slug !== initialSlug ? slugHint : "Малки латински букви, цифри и тире."}>
            <Input id={`${idPrefix}-slug`} value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={80} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Отказ
            </Button>
            <Button type="submit" pending={pending}>
              Запази
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const SLUG_HINT = "Смяната на адреса променя връзките за търсене по тази марка или модел.";

export function EditMakeDialog({ id, name, slug }: { id: string; name: string; slug: string }) {
  return (
    <NameSlugDialog
      title={`Марка: ${name}`}
      idPrefix={`make-${id.slice(0, 8)}`}
      initialName={name}
      initialSlug={slug}
      slugHint={SLUG_HINT}
      onSave={(values) => updateMakeAction({ id, ...values })}
    />
  );
}

export function EditModelDialog({ id, name, slug }: { id: string; name: string; slug: string }) {
  return (
    <NameSlugDialog
      title={`Модел: ${name}`}
      idPrefix={`model-${id.slice(0, 8)}`}
      initialName={name}
      initialSlug={slug}
      slugHint={SLUG_HINT}
      onSave={(values) => updateModelAction({ id, ...values })}
    />
  );
}

export function ActiveToggle({ kind, id, isActive, label }: { kind: "make" | "model"; id: string; isActive: boolean; label: string }) {
  const { pending, error, run } = useAdminAction();
  const action = kind === "make" ? setMakeActiveAction : setModelActiveAction;
  return (
    <span className="inline-flex flex-col items-start">
      <Button
        variant="link"
        className={isActive ? "text-sm text-ink-2" : "text-sm"}
        disabled={pending}
        aria-label={`${isActive ? "Деактивирай" : "Активирай"} ${label}`}
        onClick={() => void run(() => action({ id, isActive: !isActive }))}
      >
        {isActive ? "Деактивирай" : "Активирай"}
      </Button>
      <InlineError message={error} />
    </span>
  );
}

export function CreateModelForm({ makeId, defaultVehicleType }: { makeId: string; defaultVehicleType: VehicleType }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>(defaultVehicleType);
  const { pending, formError, fieldErrors, run } = useAdminAction();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void run(() => createModelAction({ makeId, name, slug, vehicleType }), () => {
          setName("");
          setSlug("");
        });
      }}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface p-3"
      aria-label="Нов модел"
    >
      <Field label="Нов модел" htmlFor="model-new-name" error={fieldErrors.name} className="w-full sm:w-52">
        <Input id="model-new-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required className="h-9 text-sm" />
      </Field>
      <Field label="Адрес (по желание)" htmlFor="model-new-slug" error={fieldErrors.slug} className="w-full sm:w-44">
        <Input id="model-new-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder={slugify(name) || "x5"} maxLength={80} className="h-9 text-sm" />
      </Field>
      <Field label="Вид" htmlFor="model-new-type" error={fieldErrors.vehicleType} className="w-full sm:w-64">
        <Select id="model-new-type" value={vehicleType} onChange={(event) => setVehicleType(event.target.value as VehicleType)} className="h-9 text-sm">
          {VEHICLE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" size="sm" className="h-9" pending={pending}>
        Добави модел
      </Button>
      <InlineError message={formError} />
    </form>
  );
}

type GenerationValues = { name: string; yearFrom: string; yearTo: string };

function toGenerationInput(values: GenerationValues) {
  return {
    name: values.name,
    yearFrom: Number.parseInt(values.yearFrom, 10),
    yearTo: values.yearTo.trim() === "" ? null : Number.parseInt(values.yearTo, 10),
  };
}

function GenerationFields({ idPrefix, values, onChange, errors }: { idPrefix: string; values: GenerationValues; onChange: (values: GenerationValues) => void; errors: Record<string, string> }) {
  return (
    <>
      <Field label="Поколение" htmlFor={`${idPrefix}-name`} error={errors["values.name"]} className="w-full sm:w-44">
        <Input id={`${idPrefix}-name`} value={values.name} onChange={(event) => onChange({ ...values, name: event.target.value })} maxLength={60} required className="h-9 text-sm" />
      </Field>
      <Field label="От година" htmlFor={`${idPrefix}-from`} error={errors["values.yearFrom"]} className="w-[calc(50%-4px)] sm:w-24">
        <Input
          id={`${idPrefix}-from`}
          type="number"
          inputMode="numeric"
          value={values.yearFrom}
          onChange={(event) => onChange({ ...values, yearFrom: event.target.value })}
          required
          className="h-9 text-sm"
        />
      </Field>
      <Field label="До година" htmlFor={`${idPrefix}-to`} error={errors["values.yearTo"]} className="w-[calc(50%-4px)] sm:w-24">
        <Input
          id={`${idPrefix}-to`}
          type="number"
          inputMode="numeric"
          value={values.yearTo}
          onChange={(event) => onChange({ ...values, yearTo: event.target.value })}
          placeholder="сега"
          className="h-9 text-sm"
        />
      </Field>
    </>
  );
}

export function CreateGenerationForm({ modelId }: { modelId: string }) {
  const empty: GenerationValues = { name: "", yearFrom: "", yearTo: "" };
  const [values, setValues] = useState<GenerationValues>(empty);
  const { pending, formError, fieldErrors, run } = useAdminAction();
  const idPrefix = `gen-new-${modelId.slice(0, 8)}`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void run(() => createGenerationAction({ modelId, values: toGenerationInput(values) }), () => setValues(empty));
      }}
      className="flex flex-wrap items-end gap-2"
      aria-label="Ново поколение"
    >
      <GenerationFields idPrefix={idPrefix} values={values} onChange={setValues} errors={fieldErrors} />
      <Button type="submit" size="sm" variant="secondary" className="h-9" pending={pending}>
        Добави поколение
      </Button>
      <InlineError message={formError} />
    </form>
  );
}

export function EditGenerationDialog({ id, name, yearFrom, yearTo }: { id: string; name: string; yearFrom: number; yearTo: number | null }) {
  const initial: GenerationValues = { name, yearFrom: String(yearFrom), yearTo: yearTo === null ? "" : String(yearTo) };
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<GenerationValues>(initial);
  const { pending, formError, fieldErrors, run, reset } = useAdminAction();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValues(initial);
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="link" className="text-sm">
          Редактирай
        </Button>
      </DialogTrigger>
      <DialogContent title={`Поколение: ${name}`}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => updateGenerationAction({ id, values: toGenerationInput(values) }), () => setOpen(false));
          }}
        >
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <div className="flex flex-wrap items-end gap-2">
            <GenerationFields idPrefix={`gen-${id.slice(0, 8)}`} values={values} onChange={setValues} errors={fieldErrors} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Отказ
            </Button>
            <Button type="submit" pending={pending}>
              Запази
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteGenerationButton({ id, name }: { id: string; name: string }) {
  const { error, run, reset } = useAdminAction();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="link" className="text-sm text-danger" onClick={reset}>
          Изтрий
        </Button>
      }
      title={`Изтриване на ${name}`}
      confirmLabel="Изтрий"
      onConfirm={() => run(() => deleteGenerationAction({ id }))}
    >
      <div className="space-y-3 text-sm text-ink-2">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <p>Поколението се изтрива окончателно. Поколения, използвани в обяви, не могат да бъдат изтрити.</p>
      </div>
    </ConfirmDialog>
  );
}
