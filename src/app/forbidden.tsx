import { ButtonLink } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="container-page py-16 text-center">
      <p className="text-sm font-medium text-muted">403</p>
      <h1 className="mt-2 text-2xl font-semibold">Нямаш достъп до тази страница</h1>
      <p className="mt-2 text-ink-2">Профилът ти няма нужните права.</p>
      <div className="mt-6 flex justify-center">
        <ButtonLink href="/">Към началото</ButtonLink>
      </div>
    </div>
  );
}
