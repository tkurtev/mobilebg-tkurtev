"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-16 text-center">
      <h1 className="text-2xl font-semibold">Нещо се обърка</h1>
      <p className="mt-2 text-ink-2">Страницата не можа да се зареди. Опитай отново.</p>
      {error.digest ? <p className="mt-1 text-sm text-muted">Код: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={reset}>Опитай отново</Button>
        <ButtonLink href="/" variant="secondary">
          Към началото
        </ButtonLink>
      </div>
    </div>
  );
}
