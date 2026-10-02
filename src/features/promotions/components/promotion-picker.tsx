import Form from "next/form";
import { PROMOTION_PRODUCTS, type PromotionType } from "@/config/promotions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { promotionDurationLabel, promotionWindow } from "../catalog";
import type { PromotableListing } from "../queries";

/** Native radio group in a GET form: submitting navigates to /demo-plashtane?obiava=...&paket=... */
export function PromotionPicker({ listing, defaultType }: { listing: PromotableListing; defaultType: PromotionType }) {
  const now = new Date();
  return (
    <Form action="/demo-plashtane">
      <input type="hidden" name="obiava" value={listing.id} />
      <fieldset disabled={!listing.promotable}>
        <legend className="sr-only">Промоция</legend>
        <div className="space-y-2">
          {PROMOTION_PRODUCTS.map((product) => {
            const active = listing.activePromotions.find((promotion) => promotion.type === product.type);
            const extension = active ? promotionWindow(product, active.endsAt, now) : null;
            return (
              <label
                key={product.type}
                data-testid={`promotion-option-${product.type}`}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 transition-colors hover:border-line-strong has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 sm:px-4"
              >
                <input
                  type="radio"
                  name="paket"
                  value={product.type}
                  defaultChecked={product.type === defaultType}
                  className="mt-1 size-4 shrink-0 cursor-pointer accent-brand disabled:cursor-not-allowed"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{product.name}</span>
                    <span className="font-semibold whitespace-nowrap tabular">{formatPrice(product.priceCents)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-2">{product.description}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {promotionDurationLabel(product)}
                    {active && extension ? `. Активна до ${formatDate(active.endsAt)}, ще бъде удължена до ${formatDate(extension.endsAt)}.` : null}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" size="lg" className="w-full sm:w-auto" data-testid="promotion-continue">
            Продължи към плащане
          </Button>
        </div>
      </fieldset>
    </Form>
  );
}
