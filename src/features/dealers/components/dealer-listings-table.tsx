import Link from "next/link";
import { LISTING_STATUS_LABELS, LISTING_STATUS_TONES } from "@/config/listing-status";
import { StatusLabel } from "@/components/ui/status-label";
import { formatDate, formatNumber } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import type { DealerListingRow } from "../queries";

const HEAD = "px-3 py-2 text-left text-[13px] font-medium whitespace-nowrap text-muted";
const NUM_HEAD = `${HEAD} text-right`;
const CELL = "px-3 py-2 align-middle";
const NUM_CELL = `${CELL} text-right tabular`;

export function DealerListingsTable({ items }: { items: DealerListingRow[] }) {
  return (
    // w-0 + min-w-full keeps the wide table from widening auto-sized parent grid tracks on small screens.
    <div className="w-0 min-w-full overflow-x-auto rounded-lg border border-line bg-surface" data-testid="dealer-listings-table">
      <table className="w-full min-w-[820px] text-sm">
        <caption className="sr-only">Обяви на дилъра</caption>
        <thead className="border-b border-line bg-subtle/60">
          <tr>
            <th scope="col" className={HEAD}>
              <span className="sr-only">Снимка</span>
            </th>
            <th scope="col" className={HEAD}>
              Заглавие
            </th>
            <th scope="col" className={NUM_HEAD}>
              Цена
            </th>
            <th scope="col" className={HEAD}>
              Статус
            </th>
            <th scope="col" className={NUM_HEAD}>
              Прегледи
            </th>
            <th scope="col" className={NUM_HEAD}>
              Любими
            </th>
            <th scope="col" className={NUM_HEAD}>
              Запитвания
            </th>
            <th scope="col" className={HEAD}>
              Изтича
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-subtle/50" data-testid="dealer-listing-row">
              <td className={`${CELL} w-[76px]`}>
                <div className="h-12 w-16 overflow-hidden rounded-sm border border-line bg-subtle">
                  {item.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverImageUrl} alt="" loading="lazy" className="size-full object-cover" />
                  ) : null}
                </div>
              </td>
              <td className={`${CELL} min-w-56`}>
                <Link href={item.href} className="line-clamp-1 font-medium text-ink hover:text-brand hover:underline">
                  {item.title || "Без заглавие"}
                </Link>
                <div className="mt-0.5 flex gap-3 text-[13px]">
                  <Link href={`/publikuvai/${item.id}`} aria-label={`Редактирай ${item.title}`} className="font-medium text-brand hover:underline">
                    Редактирай
                  </Link>
                  {item.status === "ACTIVE" ? (
                    <Link href={`/profil/obiavi/${item.id}/promotirane`} aria-label={`Промотирай ${item.title}`} className="font-medium text-brand hover:underline">
                      Промотирай
                    </Link>
                  ) : null}
                </div>
              </td>
              <td className={`${NUM_CELL} whitespace-nowrap`}>{item.priceCents !== null ? formatPrice(item.priceCents) : <span className="text-muted">-</span>}</td>
              <td className={`${CELL} whitespace-nowrap`}>
                <StatusLabel tone={LISTING_STATUS_TONES[item.status]}>{LISTING_STATUS_LABELS[item.status]}</StatusLabel>
              </td>
              <td className={NUM_CELL}>{formatNumber(item.viewCount)}</td>
              <td className={NUM_CELL}>{formatNumber(item.favoriteCount)}</td>
              <td className={NUM_CELL}>{formatNumber(item.inquiryCount)}</td>
              <td className={`${CELL} whitespace-nowrap tabular text-ink-2`}>
                {item.status === "ACTIVE" && item.expiresAt ? formatDate(item.expiresAt) : <span className="text-muted">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
