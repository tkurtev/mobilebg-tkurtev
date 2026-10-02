import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { PageHeading } from "@/features/account/components/account-shell";
import { ResendVerification } from "@/features/auth/components/resend-verification";
import { getCities, getRegions } from "@/features/catalog/queries";
import { DealerProfileForm } from "@/features/dealers/components/dealer-profile-form";
import { getMembershipForUser } from "@/features/dealers/queries";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Стани дилър" };

export default async function NewDealerPage() {
  const user = await requireUser("/profil/dilar/nov");
  if (user.dealer) redirect("/profil/dilar");
  const [membership, regions, cities] = await Promise.all([getMembershipForUser(user.id), getRegions(), getCities()]);

  return (
    <>
      <PageHeading title="Стани дилър" description="Дилърският профил събира обявите на фирмата на една страница с контакти и работно време." />
      {membership ? (
        <Alert tone="warning" title="Профилът ти вече е свързан с дилър">
          Дилърът „{membership.dealerName}“ в момента не е активен. Свържи се с нас, ако смяташ, че това е грешка.
        </Alert>
      ) : !user.emailVerified ? (
        <Alert tone="warning" title="Имейлът не е потвърден">
          Потвърди {user.email}, преди да регистрираш дилър. <ResendVerification email={user.email} />
        </Alert>
      ) : (
        <div className="max-w-2xl rounded-lg border border-line bg-surface p-4 sm:p-5">
          <DealerProfileForm
            mode="create"
            regions={regions.map((region) => ({ id: region.id, name: region.name }))}
            cities={cities.map((city) => ({ id: city.id, name: city.name, regionId: city.regionId }))}
          />
        </div>
      )}
    </>
  );
}
