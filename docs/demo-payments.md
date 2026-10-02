# Demo payments and promotions

Paid promotions (VIP, TOP, Открояване, Обновяване) use a demo payment provider. There is no Stripe, PayPal or myPOS integration, no payment API, no webhook, no secret and no payment-related environment variable. The flow works right after cloning and never makes a network request.

Why demo: the marketplace logic (pricing, activation, ranking, history) can be built and tested end to end without merchant accounts or PCI scope. A real provider can be added later behind the same interface.

## Flow

```
/profil/obiavi/<id>/promotirane   choose a package (GET form)
  -> /demo-plashtane?obiava=<id>&paket=<TYPE>
  -> card form, format checks in the browser only
  -> checkoutAction({ listingId, promotionType })
  -> purchasePromotion(actor, input)
       ownership (canManageListing) and visibility (isPubliclyVisible) checks
       enforceRateLimit("checkout", userId)
       transaction:
         lock listing row
         reject a SUCCEEDED payment for the same listing and type in the last 15 seconds
         insert payment PENDING, amount from PROMOTION_PRODUCTS
         -> getPaymentProvider().createPayment(...)
         -> payment SUCCEEDED + providerReference
         -> activatePromotion(tx, ...)   promotions row, listing columns, notification
  -> success panel with the end date and the demo reference
```

If the provider returns anything but `SUCCEEDED` (or a different amount or currency), the payment is stored as `FAILED`, nothing is activated and the user sees an error.

## Provider interface

`src/features/payments/provider.ts`

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
}

type CreatePaymentInput = {
  paymentId: string; // our payments.id, usable as an idempotency key
  amountCents: number;
  currency: "EUR";
  description: string;
  metadata: { listingId: string; promotionType: PromotionType; userId: string };
};

type PaymentResult = { id: string; status: "PENDING" | "SUCCEEDED" | "FAILED"; provider: "DEMO"; amountCents: number; currency: "EUR" };
```

`getPaymentProvider()` returns the single active provider. `DemoPaymentProvider` (`demo-provider.ts`) succeeds for any positive EUR amount and returns `crypto.randomUUID()` as the reference.

## Card data

Card data goes nowhere. The name, number, expiry and CVC fields exist only in the browser form (`checkout-form.tsx`) and are checked for format by `card-validation.ts`: 13 to 19 digits, a valid month that is not in the past, a 3 or 4 digit CVC. There is no Luhn check and no card lookup, so any well-formed card succeeds.

The server action input is only `{ listingId, promotionType }`. The schema is strict, so a request that carries card fields or an amount is rejected. Card data is never sent, logged or stored. The amount is always computed on the server from `src/config/promotions.ts`.

## Adding a real provider later

1. Implement `PaymentProvider` in a new module (for example `stripe-provider.ts`), using `paymentId` as the idempotency key. Card entry happens on the provider's hosted page or element, never in our form.
2. Add the provider name to `paymentProviderEnum` (migration) and its configuration to the environment.
3. Return it from `getPaymentProvider()`.
4. For asynchronous confirmation, return `PENDING`, add a webhook route handler that verifies the signature, marks the payment `SUCCEEDED` or `FAILED` and calls `activatePromotion` in one transaction.
5. Leave `activatePromotion`, pricing, ranking and the pages unchanged.

## Promotion activation and ranking

`activatePromotion(tx, { listingId, type, paymentId, userId })` in `src/features/promotions/service.ts`:

- Inserts a `promotions` row.
- VIP, TOP and Открояване: if the same type is still active, the new period starts at the current end date (extension); otherwise it starts now. The end date is written to `listings.vip_until`, `top_until` or `highlight_until`.
- Обновяване (REFRESH) is instant: `listings.sort_date = now`, and the promotion row has `ends_at = starts_at`.
- Creates a `PROMOTION_ACTIVATED` notification with a link to the listing.

| Package | Price | Duration | Effect |
| --- | --- | --- | --- |
| VIP | 9,99 € | 14 days | Ranked first in search, shown in the promoted section on the home page, VIP label |
| TOP | 4,99 € | 7 days | Ranked after VIP and above standard listings, TOP label |
| Открояване | 2,99 € | 7 days | Tinted card in results |
| Обновяване | 1,49 € | instant | Moves the listing to the top of "Най-нови" |

Search orders by `vip_until > now()` first, then `top_until > now()`, then the selected sort. The listing columns are the source of truth for ranking; `promotions` and `payments` are the history. Selling or archiving a listing clears the promotion columns.

## Pages

- `/profil/obiavi/<id>/promotirane`: owner only, active promotions and package choice.
- `/demo-plashtane`: order summary and the demo card form, noindex.
- `/profil/plashtaniya`: the user's payment history.
