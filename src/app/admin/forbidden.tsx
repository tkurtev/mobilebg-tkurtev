import { ButtonLink } from "@/components/ui/button";

export default function AdminForbidden() {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium text-muted">403</p>
      <h1 className="mt-2 text-2xl font-semibold">Нямаш достъп до този раздел</h1>
      <p className="mt-2 text-ink-2">Ролята ти не включва нужните права.</p>
      <div className="mt-6 flex justify-center">
        <ButtonLink href="/admin" variant="secondary">
          Към таблото
        </ButtonLink>
      </div>
    </div>
  );
}
