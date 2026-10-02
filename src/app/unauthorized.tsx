import { ButtonLink } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="container-page py-16 text-center">
      <p className="text-sm font-medium text-muted">401</p>
      <h1 className="mt-2 text-2xl font-semibold">Необходим е вход</h1>
      <p className="mt-2 text-ink-2">Влез в профила си, за да видиш тази страница.</p>
      <div className="mt-6 flex justify-center gap-2">
        <ButtonLink href="/vhod">Вход</ButtonLink>
        <ButtonLink href="/registratsiya" variant="secondary">
          Регистрация
        </ButtonLink>
      </div>
    </div>
  );
}
