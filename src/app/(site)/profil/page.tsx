import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/db/client";
import { favorites, listings, savedSearches } from "@/db/schema";
import { PageHeading } from "@/features/account/components/account-shell";
import { ResendVerification } from "@/features/auth/components/resend-verification";
import { RecentlyViewedSection } from "@/features/home/components/recently-viewed-local";
import { getCardsByIds } from "@/features/listings/queries";
import { countUnreadConversations } from "@/features/messages/unread";
import { getRecentlyViewedIds } from "@/features/recently-viewed/service";
import { formatNumber } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Моят профил" };

async function loadSummary(userId: string, dealerId: string | null) {
  const owner = dealerId ? sql`(${listings.sellerId} = ${userId} OR ${listings.dealerId} = ${dealerId})` : eq(listings.sellerId, userId);
  const statusRows = await db
    .select({ status: listings.status, value: count() })
    .from(listings)
    .where(and(owner, isNull(listings.deletedAt), inArray(listings.status, ["ACTIVE", "DRAFT", "PENDING", "PAUSED", "EXPIRED", "REJECTED"])))
    .groupBy(listings.status);
  const byStatus = Object.fromEntries(statusRows.map((row) => [row.status, row.value])) as Record<string, number>;
  const [[favoriteCount], [searchCount], unread] = await Promise.all([
    db.select({ value: count() }).from(favorites).where(eq(favorites.userId, userId)),
    db.select({ value: count() }).from(savedSearches).where(eq(savedSearches.userId, userId)),
    countUnreadConversations(userId),
  ]);
  return { byStatus, favorites: favoriteCount?.value ?? 0, searches: searchCount?.value ?? 0, unread };
}

export default async function ProfilePage() {
  const user = await requireUser("/profil");
  const [summary, recentIds] = await Promise.all([loadSummary(user.id, user.dealerId), getRecentlyViewedIds(user.id, 6)]);
  const recent = await getCardsByIds(recentIds);
  const tiles = [
    { label: "Активни обяви", value: summary.byStatus.ACTIVE ?? 0, href: "/profil/obiavi?status=active" },
    { label: "Чернови", value: summary.byStatus.DRAFT ?? 0, href: "/profil/obiavi?status=draft" },
    { label: "Любими", value: summary.favorites, href: "/lyubimi" },
    { label: "Непрочетени съобщения", value: summary.unread, href: "/suobshteniya" },
  ];
  const attention = (summary.byStatus.REJECTED ?? 0) + (summary.byStatus.EXPIRED ?? 0);

  return (
    <>
      <PageHeading title={`Здравей, ${user.name.split(" ")[0]}`} actions={<ButtonLink href="/publikuvai">Публикувай обява</ButtonLink>} />
      {!user.emailVerified ? (
        <Alert tone="warning" title="Имейлът не е потвърден" className="mb-4">
          Потвърди {user.email}, за да публикуваш обяви и да пишеш на продавачи. <ResendVerification email={user.email} />
        </Alert>
      ) : null}
      {attention > 0 ? (
        <Alert tone="warning" className="mb-4">
          Имаш {attention} {attention === 1 ? "обява, която изисква" : "обяви, които изискват"} внимание.{" "}
          <Link href="/profil/obiavi?status=attention" className="font-medium underline">
            Прегледай
          </Link>
        </Alert>
      ) : null}
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label} className="bg-surface">
            <Link href={tile.href} className="block px-4 py-3 hover:bg-subtle">
              <span className="block text-2xl font-semibold tabular">{formatNumber(tile.value)}</span>
              <span className="text-sm text-ink-2">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/profil/tarseniya" className="text-brand hover:underline">
          Запазени търсения ({summary.searches})
        </Link>
        <Link href="/profil/nastroiki" className="text-brand hover:underline">
          Настройки на профила
        </Link>
        {user.dealer ? (
          <Link href="/profil/dilar" className="text-brand hover:underline">
            Дилърски панел: {user.dealer.name}
          </Link>
        ) : null}
      </div>
      {recent.length > 0 ? (
        <div className="mt-8">
          <RecentlyViewedSection items={recent} />
        </div>
      ) : null}
    </>
  );
}
