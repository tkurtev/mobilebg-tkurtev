import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPromotionProduct, isPromotionType, type PromotionProduct } from "@/config/promotions";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { CheckoutForm } from "@/features/payments/components/checkout-form";
import { promotionDurationLabel, promotionEnd } from "@/features/promotions/catalog";
import { getPromotableListing, type PromotableListing } from "@/features/promotions/queries";
import { formatDate } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { requireUser, type CurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Демо плащане", robots: { index: false, follow: false } };

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function CheckoutError({ title, message }: { title: string; message: string }) {
  return (
    <Panel className="mt-4">
      <PanelBody className="py-6">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-ink-2">{message}</p>
        <ButtonLink href="/profil/obiavi" variant="secondary" className="mt-4">
          Към моите обяви
        </ButtonLink>
      </PanelBody>
    </Panel>
  );
}

type Checkout = { ok: true; listing: PromotableListing; product: PromotionProduct } | { ok: false; title: string; message: string; listingId: string | null };

async function resolveCheckout(user: CurrentUser, listingId: string, type: string): Promise<Checkout> {
  const product = isPromotionType(type) ? getPromotionProduct(type) : undefined;
  if (!product) return { ok: false, title: "Невалидна поръчка", message: "Избери промоция от страницата за промотиране на обявата.", listingId: null };
  const listing = await getPromotableListing(user, listingId);
  if (!listing) return { ok: false, title: "Обявата не е намерена", message: "Обявата не съществува или не е твоя.", listingId: null };
  if (!listing.promotable) return { ok: false, title: "Обявата не може да бъде промотирана", message: "Само активни обяви могат да бъдат промотирани.", listingId: listing.id };
  return { ok: true, listing, product };
}

export default async function DemoCheckoutPage(props: PageProps<"/demo-plashtane">) {
  const params = await props.searchParams;
  const listingId = single(params.obiava);
  const type = single(params.paket);
  const user = await requireUser(`/demo-plashtane?${new URLSearchParams({ obiava: listingId, paket: type })}`);
  const checkout = await resolveCheckout(user, listingId, type);
  const backId = checkout.ok ? checkout.listing.id : checkout.listingId;

  return (
    <div className="container-page max-w-4xl py-4 lg:py-6">
      <Link
        href={backId ? `/profil/obiavi/${backId}/promotirane` : "/profil/obiavi"}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {backId ? "Промотиране" : "Моите обяви"}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Демо плащане</h1>
      {checkout.ok ? <CheckoutContent listing={checkout.listing} product={checkout.product} /> : <CheckoutError title={checkout.title} message={checkout.message} />}
    </div>
  );
}

function OrderSummary({ listing, product, title }: { listing: PromotableListing; product: PromotionProduct; title: string }) {
  const currentEnd = product.type === "REFRESH" ? null : promotionEnd(listing, product.type);
  const activeUntil = currentEnd && currentEnd > new Date() ? currentEnd : null;
  return (
    <Panel>
      <PanelHeader title="Поръчка" />
      <dl className="divide-y divide-line text-[15px]">
        <div className="px-4 py-2.5 sm:px-5">
          <dt className="text-sm text-muted">Обява</dt>
          <dd className="mt-0.5 font-medium break-words">
            {title}
            <span className="block text-sm font-normal text-muted">№ {listing.number}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-2.5 sm:px-5">
          <dt className="text-muted">Пакет</dt>
          <dd className="font-medium">{product.name}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-2.5 sm:px-5">
          <dt className="text-muted">Продължителност</dt>
          <dd className="text-right">{promotionDurationLabel(product)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-5">
          <dt className="font-semibold">Сума</dt>
          <dd className="text-lg font-semibold tabular">{formatPrice(product.priceCents)}</dd>
        </div>
      </dl>
      {activeUntil ? (
        <p className="border-t border-line px-4 py-2.5 text-sm text-ink-2 sm:px-5">
          {product.name} е активна до {formatDate(activeUntil)}. Новият период започва след тази дата.
        </p>
      ) : null}
    </Panel>
  );
}

function CheckoutContent({ listing, product }: { listing: PromotableListing; product: PromotionProduct }) {
  const title = listing.title || `Обява № ${listing.number}`;
  return (
    <>
      <div data-testid="demo-payment-notice" className="mt-3">
        <Alert tone="info">Демо плащане. Няма да бъде извършена реална транзакция.</Alert>
      </div>
      <CheckoutForm
        listingId={listing.id}
        listingTitle={title}
        promotionType={product.type}
        productName={product.name}
        amountCents={product.priceCents}
        summary={<OrderSummary listing={listing} product={product} title={title} />}
      />
    </>
  );
}
