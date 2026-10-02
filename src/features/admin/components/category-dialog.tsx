"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { ATTRIBUTE_SET_KEYS, ATTRIBUTE_SETS } from "@/config/attribute-sets";
import { VEHICLE_TYPES } from "@/config/categories";
import { slugify } from "@/lib/slug";
import { createCategoryAction, updateCategoryAction } from "../actions/categories";
import { categoryInputSchema, type CategoryInput } from "../schemas";
import { useAdminAction } from "./use-admin-action";

type CategoryDialogProps =
  | { mode: "create"; defaults?: undefined; categoryId?: undefined; listingCount?: undefined; nextSortOrder: number }
  | { mode: "edit"; defaults: CategoryInput; categoryId: string; listingCount: number; nextSortOrder?: undefined };

export function CategoryDialog(props: CategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const initial: CategoryInput = props.defaults ?? { name: "", slug: "", sortOrder: props.nextSortOrder, isActive: true, attributeSet: "car", vehicleType: "car" };
  const form = useForm<CategoryInput>({ resolver: zodResolver(categoryInputSchema), defaultValues: initial });
  const { pending, formError, fieldErrors, run, reset } = useAdminAction();
  const errorFor = (key: keyof CategoryInput) => form.formState.errors[key]?.message ?? fieldErrors[key];
  const slug = useWatch({ control: form.control, name: "slug" });
  const slugChanged = props.mode === "edit" && slug !== props.defaults.slug;
  const idPrefix = props.mode === "edit" ? `cat-${props.categoryId.slice(0, 8)}` : "cat-new";

  const onSubmit = form.handleSubmit((values) => {
    const action = props.mode === "edit" ? () => updateCategoryAction({ ...values, id: props.categoryId }) : () => createCategoryAction(values);
    void run<unknown>(action, () => setOpen(false));
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          form.reset(initial);
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        {props.mode === "edit" ? (
          <Button variant="link" className="text-sm">
            Редактирай
          </Button>
        ) : (
          <Button size="sm">Нова категория</Button>
        )}
      </DialogTrigger>
      <DialogContent title={props.mode === "edit" ? `Категория: ${props.defaults.name}` : "Нова категория"}>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <Field label="Име" htmlFor={`${idPrefix}-name`} required error={errorFor("name")}>
            <Input
              id={`${idPrefix}-name`}
              aria-invalid={Boolean(errorFor("name"))}
              {...form.register("name", {
                onBlur: (event) => {
                  if (props.mode === "create" && !form.getValues("slug")) form.setValue("slug", slugify(event.target.value, 60));
                },
              })}
            />
          </Field>
          <Field
            label="Адрес (slug)"
            htmlFor={`${idPrefix}-slug`}
            required
            error={errorFor("slug")}
            hint="Малки латински букви, цифри и тире."
          >
            <Input id={`${idPrefix}-slug`} aria-invalid={Boolean(errorFor("slug"))} {...form.register("slug")} />
          </Field>
          {slugChanged ? <Alert tone="warning">Смяната на адреса променя URL на категорията и на всичките ѝ обяви. Старите връзки спират да работят.</Alert> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Набор от характеристики" htmlFor={`${idPrefix}-set`} required error={errorFor("attributeSet")}>
              <Select id={`${idPrefix}-set`} aria-invalid={Boolean(errorFor("attributeSet"))} {...form.register("attributeSet")}>
                {ATTRIBUTE_SET_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {ATTRIBUTE_SETS[key].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Марки и модели" htmlFor={`${idPrefix}-type`} error={errorFor("vehicleType")}>
              <Select id={`${idPrefix}-type`} aria-invalid={Boolean(errorFor("vehicleType"))} {...form.register("vehicleType")}>
                <option value="">Без марки</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Подредба" htmlFor={`${idPrefix}-order`} required error={errorFor("sortOrder")} hint="По-малките числа са първи.">
              <Input id={`${idPrefix}-order`} type="number" inputMode="numeric" min={0} aria-invalid={Boolean(errorFor("sortOrder"))} {...form.register("sortOrder", { valueAsNumber: true })} />
            </Field>
            <div className="sm:pt-7">
              <Checkbox label="Активна" {...form.register("isActive")} />
            </div>
          </div>
          {props.mode === "edit" && props.listingCount > 0 ? (
            <p className="text-sm text-muted">
              Категорията има {props.listingCount} {props.listingCount === 1 ? "обява" : "обяви"}. Смяната на набора от характеристики променя кои данни се показват в тях.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Отказ
            </Button>
            <Button type="submit" pending={pending}>
              {props.mode === "edit" ? "Запази" : "Създай"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
