import { formatDate, sofiaDayKey } from "@/lib/format";
import type { ThreadMessage } from "../queries";

/** Union by id, ordered like the server: createdAt, then id. */
export function mergeMessages(base: ThreadMessage[], incoming: ThreadMessage[]): ThreadMessage[] {
  if (incoming.length === 0) return base;
  const byId = new Map(base.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1));
}

export type DayGroup = { key: string; label: string; messages: ThreadMessage[] };

function dayLabel(key: string, date: Date, todayKey: string): string {
  const days = Math.round((Date.parse(todayKey) - Date.parse(key)) / 86_400_000);
  if (days <= 0) return "Днес";
  if (days === 1) return "Вчера";
  return formatDate(date);
}

/** Groups by calendar day in Sofia time. */
export function groupByDay(messages: ThreadMessage[], now: Date = new Date()): DayGroup[] {
  const todayKey = sofiaDayKey(now);
  const groups: DayGroup[] = [];
  for (const message of messages) {
    const date = new Date(message.createdAt);
    const key = sofiaDayKey(date);
    const last = groups.at(-1);
    if (last && last.key === key) last.messages.push(message);
    else groups.push({ key, label: dayLabel(key, date, todayKey), messages: [message] });
  }
  return groups;
}
