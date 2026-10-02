import { formatNumber } from "@/lib/format";
import type { DealerStats } from "../queries";

export function DealerStatsStrip({ stats }: { stats: DealerStats }) {
  const items = [
    { key: "active", label: "Активни обяви", value: stats.active },
    { key: "drafts", label: "Чернови", value: stats.drafts },
    { key: "sold", label: "Продадени, 90 дни", value: stats.soldRecent },
    { key: "views", label: "Прегледи", value: stats.views },
    { key: "favorites", label: "Любими", value: stats.favorites },
    { key: "inquiries", label: "Запитвания, 30 дни", value: stats.inquiries },
    { key: "promotions", label: "Активни промоции", value: stats.activePromotions },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4 xl:grid-cols-7" data-testid="dealer-stats">
      {items.map((item) => (
        <div key={item.key} className="flex flex-col-reverse bg-surface px-3 py-2.5 last:col-span-2 xl:last:col-span-1" data-testid={`dealer-stat-${item.key}`}>
          <dt className="text-[13px] leading-tight text-ink-2">{item.label}</dt>
          <dd className="text-xl font-semibold tabular">{formatNumber(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
