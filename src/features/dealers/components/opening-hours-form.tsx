"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { updateOpeningHoursAction } from "../actions";
import { WEEK_DAYS, type OpeningHoursDay } from "../hours";
import { openingHoursSchema } from "../schemas";

type DayState = { dayOfWeek: number; isClosed: boolean; opensAt: string; closesAt: string };
type DayErrors = Record<number, { opensAt?: string; closesAt?: string }>;

function toState(hours: OpeningHoursDay[]): DayState[] {
  return WEEK_DAYS.map(({ day }) => {
    const row = hours.find((entry) => entry.dayOfWeek === day);
    return { dayOfWeek: day, isClosed: row?.isClosed ?? true, opensAt: row?.opensAt ?? "09:00", closesAt: row?.closesAt ?? "18:00" };
  });
}

function collectErrors(issues: { path: PropertyKey[]; message: string }[]): DayErrors {
  const result: DayErrors = {};
  for (const issue of issues) {
    const [, index, field] = issue.path;
    if (typeof index !== "number" || (field !== "opensAt" && field !== "closesAt")) continue;
    result[index] = { ...result[index], [field]: result[index]?.[field] ?? issue.message };
  }
  return result;
}

export function OpeningHoursForm({ hours }: { hours: OpeningHoursDay[] }) {
  const [days, setDays] = useState<DayState[]>(() => toState(hours));
  const [errors, setErrors] = useState<DayErrors>({});
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (index: number, patch: Partial<DayState>) => {
    setDays((current) => current.map((day, position) => (position === index ? { ...day, ...patch } : day)));
    setMessage(null);
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = openingHoursSchema.safeParse({ days });
    if (!parsed.success) {
      setErrors(collectErrors(parsed.error.issues));
      setMessage({ tone: "danger", text: "Провери часовете." });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await updateOpeningHoursAction({ days });
      if (result.ok) {
        setMessage({ tone: "success", text: "Работното време е запазено." });
        return;
      }
      const fieldIssues = Object.entries(result.fieldErrors ?? {}).map(([key, text]) => ({
        path: key.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part)),
        message: text,
      }));
      setErrors(collectErrors(fieldIssues));
      setMessage({ tone: "danger", text: result.error });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" data-testid="dealer-hours-form">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <fieldset>
        <legend className="sr-only">Работно време по дни</legend>
        <ul className="divide-y divide-line rounded-md border border-line">
          {days.map((day, index) => {
            const label = WEEK_DAYS[index]?.label ?? "";
            const dayErrors = errors[index];
            return (
              <li key={day.dayOfWeek} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
                <span className="w-24 shrink-0 text-[15px] font-medium text-ink">{label}</span>
                <label className="flex w-28 cursor-pointer items-center gap-2 text-sm text-ink-2 select-none">
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer rounded-sm border-line-strong accent-brand"
                    checked={day.isClosed}
                    aria-label={`${label}: затворено`}
                    onChange={(event) => update(index, { isClosed: event.target.checked })}
                  />
                  Затворено
                </label>
                <div className={cn("flex items-center gap-2", day.isClosed && "opacity-55")}>
                  <label htmlFor={`hours-${day.dayOfWeek}-from`} className="text-sm text-ink-2">
                    от
                  </label>
                  <Input
                    id={`hours-${day.dayOfWeek}-from`}
                    type="time"
                    value={day.opensAt}
                    disabled={day.isClosed}
                    onChange={(event) => update(index, { opensAt: event.target.value })}
                    aria-label={`${label}, от`}
                    aria-invalid={dayErrors?.opensAt ? true : undefined}
                    className="h-9 w-28 px-2 text-sm tabular"
                  />
                  <label htmlFor={`hours-${day.dayOfWeek}-to`} className="text-sm text-ink-2">
                    до
                  </label>
                  <Input
                    id={`hours-${day.dayOfWeek}-to`}
                    type="time"
                    value={day.closesAt}
                    disabled={day.isClosed}
                    onChange={(event) => update(index, { closesAt: event.target.value })}
                    aria-label={`${label}, до`}
                    aria-invalid={dayErrors?.closesAt ? true : undefined}
                    className="h-9 w-28 px-2 text-sm tabular"
                  />
                </div>
                {dayErrors ? (
                  <p className="w-full text-sm text-danger" role="alert">
                    {dayErrors.opensAt ?? dayErrors.closesAt}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" pending={pending}>
          Запази работното време
        </Button>
      </div>
    </form>
  );
}
