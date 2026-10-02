"use client";

import "@/styles/globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="bg">
      <body className="flex min-h-dvh items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">MobiTed не е достъпен в момента</h1>
          <p className="mt-2 text-ink-2">Опитай отново след малко.</p>
          <button type="button" onClick={reset} className="mt-6 h-10 rounded-md bg-brand px-4 font-medium text-white">
            Опитай отново
          </button>
        </div>
      </body>
    </html>
  );
}
