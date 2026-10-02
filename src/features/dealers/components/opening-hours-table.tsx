import { cn } from "@/lib/cn";
import { formatDayHours, WEEK_DAYS, type OpeningHoursDay } from "../hours";

/** today is an ISO weekday (1 = Monday) in Europe/Sofia; pass null to skip highlighting. */
export function OpeningHoursTable({ hours, today, caption }: { hours: OpeningHoursDay[]; today: number | null; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {WEEK_DAYS.map(({ day, label }) => {
          const row = hours.find((entry) => entry.dayOfWeek === day);
          const isToday = day === today;
          return (
            <tr key={day} className={cn("border-t border-line first:border-t-0", isToday && "bg-brand-soft font-medium text-brand-ink")} aria-current={isToday ? "date" : undefined}>
              <th scope="row" className={cn("py-1.5 pr-3 pl-2 text-left", isToday ? "font-medium" : "font-normal")}>
                {label}
                {isToday ? <span className="sr-only"> (днес)</span> : null}
              </th>
              <td className="py-1.5 pr-2 text-right tabular">{row ? formatDayHours(row) : "Почивен ден"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
