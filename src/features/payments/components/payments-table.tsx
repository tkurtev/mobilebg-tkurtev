import Link from "next/link";
import { StatusLabel } from "@/components/ui/status-label";
import { promotionName } from "@/features/promotions/catalog";
import { formatDateTime } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { PAYMENT_PROVIDER_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, shortReference } from "../labels";
import type { PaymentHistoryItem } from "../queries";

function ListingCell({ item }: { item: PaymentHistoryItem }) {
  const title = item.listingTitle || `Обява № ${item.listingNumber}`;
  return item.listingHref ? (
    <Link href={item.listingHref} className="font-medium hover:text-brand hover:underline">
      {title}
    </Link>
  ) : (
    <span className="text-ink-2">{title}</span>
  );
}

function Reference({ item }: { item: PaymentHistoryItem }) {
  return (
    <span className="text-ink-2">
      {PAYMENT_PROVIDER_LABELS[item.provider]} <span className="font-mono text-[13px]" title={item.providerReference ?? undefined}>{shortReference(item.providerReference)}</span>
    </span>
  );
}

/** Table from md up, stacked rows on phones. */
export function PaymentsTable({ items }: { items: PaymentHistoryItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-line bg-subtle text-ink-2">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Дата</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Обява</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Промоция</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Сума</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Статус</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Референция</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-4 py-3 whitespace-nowrap text-ink-2 tabular">{formatDateTime(item.createdAt)}</td>
              <td className="max-w-72 px-4 py-3 break-words">
                <ListingCell item={item} />
              </td>
              <td className="px-4 py-3">{promotionName(item.promotionType)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap tabular">{formatPrice(item.amountCents)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusLabel tone={PAYMENT_STATUS_TONES[item.status]}>{PAYMENT_STATUS_LABELS[item.status]}</StatusLabel>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Reference item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-line md:hidden">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 break-words">
                <ListingCell item={item} />
              </div>
              <span className="font-semibold whitespace-nowrap tabular">{formatPrice(item.amountCents)}</span>
            </div>
            <p className="mt-1 text-ink-2">
              {promotionName(item.promotionType)} · <span className="tabular">{formatDateTime(item.createdAt)}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <StatusLabel tone={PAYMENT_STATUS_TONES[item.status]}>{PAYMENT_STATUS_LABELS[item.status]}</StatusLabel>
              <Reference item={item} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
