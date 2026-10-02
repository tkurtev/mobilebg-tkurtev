import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PageHeading } from "@/features/account/components/account-shell";
import { PaymentsTable } from "@/features/payments/components/payments-table";
import { getUserPayments } from "@/features/payments/queries";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Плащания" };

const MAX_PAGE = 1000;

export default async function PaymentsPage(props: PageProps<"/profil/plashtaniya">) {
  const user = await requireUser("/profil/plashtaniya");
  const query = await props.searchParams;
  const requested = typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
  const page = Number.isSafeInteger(requested) && requested > 1 ? Math.min(requested, MAX_PAGE) : 1;
  const { items, total, totalPages } = await getUserPayments(user.id, page);

  return (
    <>
      <PageHeading title="Плащания" description="Всички плащания са демонстративни, без реални транзакции." />
      {total === 0 ? (
        <EmptyState title="Нямаш плащания." />
      ) : (
        <div className="space-y-4">
          {items.length > 0 ? <PaymentsTable items={items} /> : null}
          <Pagination page={page} totalPages={totalPages} hrefForPage={(target) => (target > 1 ? `/profil/plashtaniya?page=${target}` : "/profil/plashtaniya")} />
        </div>
      )}
    </>
  );
}
