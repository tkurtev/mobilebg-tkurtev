"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { RangeValue } from "../params";

export function FilterSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("border-t border-line py-3.5 first:border-t-0 first:pt-0", className)}>
      <legend className="sr-only">{title}</legend>
      <p className="mb-2 text-sm font-semibold text-ink" aria-hidden="true">
        {title}
      </p>
      {children}
    </fieldset>
  );
}

export function Disclosure({ title, children, defaultOpen = false, count = 0 }: { title: string; children: ReactNode; defaultOpen?: boolean; count?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold text-ink hover:text-brand"
      >
        <span>
          {title}
          {count > 0 ? <span className="ml-1.5 font-normal text-brand">({count})</span> : null}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? <div className="pb-3">{children}</div> : null}
    </div>
  );
}

const SMALL_CONTROL =
  "h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Всички",
  disabled,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13px] text-ink-2">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={cn(SMALL_CONTROL, "appearance-none pr-8 disabled:bg-subtle disabled:text-muted")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2366707c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
          backgroundSize: "16px",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function toText(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

function parseNumber(text: string): number | undefined {
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const value = Number.parseInt(digits, 10);
  return Number.isSafeInteger(value) ? value : undefined;
}

/** Numeric range that commits on blur or Enter so typing does not trigger a search per keystroke. */
export function RangeFilter({
  id,
  label,
  value,
  onCommit,
  unit,
}: {
  id: string;
  label: string;
  value: RangeValue;
  onCommit: (value: RangeValue) => void;
  unit?: string;
}) {
  const [from, setFrom] = useState(toText(value.from));
  const [to, setTo] = useState(toText(value.to));
  const [synced, setSynced] = useState(value);
  if (synced.from !== value.from || synced.to !== value.to) {
    setSynced(value);
    setFrom(toText(value.from));
    setTo(toText(value.to));
  }

  const commit = () => {
    const next = { from: parseNumber(from), to: parseNumber(to) };
    if (next.from !== value.from || next.to !== value.to) onCommit(next);
  };

  return (
    <div>
      <p className="mb-1 text-[13px] text-ink-2" id={`${id}-label`}>
        {label}
        {unit ? <span className="text-muted"> ({unit})</span> : null}
      </p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={`${id}-label`}>
        <input
          id={`${id}-from`}
          aria-label={`${label} от`}
          inputMode="numeric"
          placeholder="от"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), commit())}
          className={SMALL_CONTROL}
        />
        <input
          id={`${id}-to`}
          aria-label={`${label} до`}
          inputMode="numeric"
          placeholder="до"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), commit())}
          className={SMALL_CONTROL}
        />
      </div>
    </div>
  );
}

export function YearRangeFilter({ id, value, onChange, minYear }: { id: string; value: RangeValue; onChange: (value: RangeValue) => void; minYear: number }) {
  const current = new Date().getFullYear();
  const years = Array.from({ length: current - minYear + 1 }, (_, index) => String(current - index));
  const options = years.map((year) => ({ value: year, label: year }));
  return (
    <div className="grid grid-cols-2 gap-2">
      <FilterSelect id={`${id}-from`} label="Година от" value={toText(value.from) || undefined} options={options} placeholder="Всички" onChange={(from) => onChange({ ...value, from: from ? Number(from) : undefined })} />
      <FilterSelect id={`${id}-to`} label="Година до" value={toText(value.to) || undefined} options={options} placeholder="Всички" onChange={(to) => onChange({ ...value, to: to ? Number(to) : undefined })} />
    </div>
  );
}

export function CheckboxGroup({
  name,
  options,
  values,
  onChange,
  columns = 1,
  swatches,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  columns?: 1 | 2;
  swatches?: Record<string, string>;
}) {
  return (
    <div className={cn("grid gap-x-3 gap-y-1.5", columns === 2 && "grid-cols-2")}>
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <label key={option.value} className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-ink select-none">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(checked ? values.filter((value) => value !== option.value) : [...values, option.value])}
              className="mt-px size-4 shrink-0 cursor-pointer accent-brand"
            />
            {swatches?.[option.value] ? (
              <span className="mt-0.5 size-3.5 shrink-0 rounded-full border border-line-strong" style={{ backgroundColor: swatches[option.value] }} aria-hidden="true" />
            ) : null}
            <span className="min-w-0">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
