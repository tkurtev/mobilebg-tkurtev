export type OpeningHoursDay = {
  /** ISO 8601: 1 is Monday, 7 is Sunday. */
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

export const WEEK_DAYS: readonly { day: number; label: string }[] = [
  { day: 1, label: "Понеделник" },
  { day: 2, label: "Вторник" },
  { day: 3, label: "Сряда" },
  { day: 4, label: "Четвъртък" },
  { day: 5, label: "Петък" },
  { day: 6, label: "Събота" },
  { day: 7, label: "Неделя" },
];

export const DEFAULT_OPENING_HOURS: readonly OpeningHoursDay[] = WEEK_DAYS.map(({ day }) => {
  if (day <= 5) return { dayOfWeek: day, opensAt: "09:00", closesAt: "18:00", isClosed: false };
  if (day === 6) return { dayOfWeek: day, opensAt: "10:00", closesAt: "14:00", isClosed: false };
  return { dayOfWeek: day, opensAt: null, closesAt: null, isClosed: true };
});

/** Seven rows in Monday..Sunday order; days without a stored row are treated as closed. */
export function completeWeek(rows: readonly OpeningHoursDay[]): OpeningHoursDay[] {
  return WEEK_DAYS.map(({ day }) => rows.find((row) => row.dayOfWeek === day) ?? { dayOfWeek: day, opensAt: null, closesAt: null, isClosed: true });
}

export function formatDayHours(day: OpeningHoursDay): string {
  if (day.isClosed || !day.opensAt || !day.closesAt) return "Почивен ден";
  return `${day.opensAt} - ${day.closesAt}`;
}

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Sofia", weekday: "short" });
const ISO_WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Day of week in Bulgaria, independent of the server time zone. */
export function sofiaIsoWeekday(date: Date = new Date()): number {
  return ISO_WEEKDAY[weekdayFormatter.format(date)] ?? 1;
}
