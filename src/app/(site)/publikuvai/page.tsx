import { and, desc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { db } from "@/db/client";
import { categories, listings } from "@/db/schema";
import { ResendVerification } from "@/features/auth/components/resend-verification";
import { getActiveCategories } from "@/features/catalog/queries";
import { CategoryPicker } from "@/features/listings/components/category-picker";
import { formatRelativeDate } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Публикувай обява", robots: { index: false } };

export default async function PublishPage() {
  const user = await requireUser("/publikuvai");
  const [allCategories, drafts] = await Promise.all([
    getActiveCategories(),
    db
      .select({ id: listings.id, title: listings.title, updatedAt: listings.updatedAt, categoryName: categories.name })
      .from(listings)
      .innerJoin(categories, eq(categories.id, listings.categoryId))
      .where(and(eq(listings.sellerId, user.id), eq(listings.status, "DRAFT"), isNull(listings.deletedAt)))
      .orderBy(desc(listings.updatedAt))
      .limit(5),
  ]);

  return (
    <div className="container-page max-w-4xl py-6 lg:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Публикувай обява</h1>
      <p className="mt-1 text-ink-2">
        {user.dealer ? `Обявата ще бъде публикувана от името на ${user.dealer.name}.` : "Публикуването е безплатно. Черновата се запазва автоматично."}
      </p>

      {!user.emailVerified ? (
        <Alert tone="warning" title="Потвърди имейла си" className="mt-5">
          Преди да публикуваш, потвърди {user.email}. <ResendVerification email={user.email} />
        </Alert>
      ) : (
        <>
          {drafts.length > 0 ? (
            <section aria-labelledby="drafts-heading" className="mt-6 rounded-lg border border-line bg-surface">
              <h2 id="drafts-heading" className="border-b border-line px-4 py-3 font-semibold">
                Незавършени чернови
              </h2>
              <ul className="divide-y divide-line">
                {drafts.map((draft) => (
                  <li key={draft.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{draft.title || "Без заглавие"}</p>
                      <p className="text-sm text-muted">
                        {draft.categoryName} · последна промяна {formatRelativeDate(draft.updatedAt)}
                      </p>
                    </div>
                    <Link href={`/publikuvai/${draft.id}`} className="shrink-0 text-sm font-medium text-brand hover:underline">
                      Продължи
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="category-heading" className="mt-6">
            <h2 id="category-heading" className="mb-3 text-lg font-semibold">
              Избери категория
            </h2>
            <CategoryPicker categories={allCategories.map((category) => ({ id: category.id, name: category.name, slug: category.slug }))} />
          </section>
        </>
      )}
    </div>
  );
}
