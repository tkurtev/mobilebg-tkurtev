import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="container-page py-16 text-center">
          <p className="text-sm font-medium text-muted">404</p>
          <h1 className="mt-2 text-2xl font-semibold">Страницата не е намерена</h1>
          <p className="mt-2 text-ink-2">Възможно е обявата да е премахната или адресът да е грешен.</p>
          <div className="mt-6 flex justify-center gap-2">
            <ButtonLink href="/">Към началото</ButtonLink>
            <ButtonLink href="/avtomobili" variant="secondary">
              Търси автомобили
            </ButtonLink>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
