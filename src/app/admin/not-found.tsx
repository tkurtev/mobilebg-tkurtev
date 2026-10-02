import { ButtonLink } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Записът не е намерен</h1>
      <p className="mt-2 text-ink-2">Може да е изтрит или адресът да е грешен.</p>
      <div className="mt-6 flex justify-center">
        <ButtonLink href="/admin" variant="secondary">
          Към таблото
        </ButtonLink>
      </div>
    </div>
  );
}
