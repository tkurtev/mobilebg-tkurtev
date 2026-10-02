"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError, FieldHint } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { removeDealerLogoAction } from "../actions";
import { DealerLogo } from "./dealer-logo";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function LogoUploader({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // undefined follows the server value; a string or null reflects a change made here before the refresh lands.
  const [override, setOverride] = useState<string | null | undefined>(undefined);
  const current = override === undefined ? logoUrl : override;
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  async function upload(file: File) {
    setError(null);
    if (file.type && !ACCEPT.split(",").includes(file.type)) {
      setError("Позволени са само JPEG, PNG, WebP и AVIF изображения.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Файлът е по-голям от 8 MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/dilari/logo", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Качването не успя. Опитай отново.");
        return;
      }
      setOverride(data.url);
      startTransition(() => router.refresh());
    } catch {
      setError("Няма връзка със сървъра. Опитай отново.");
    } finally {
      setUploading(false);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-4" data-testid="dealer-logo">
      <div className="relative">
        <DealerLogo name={name} logoUrl={preview ?? current} className="size-24 text-3xl" />
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-md bg-surface/70">
            <Spinner className="size-6 text-brand" label="Качване" />
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          id="dealer-logo-file"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-describedby={error ? "dealer-logo-error" : "dealer-logo-hint"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            pending={uploading}
            icon={<Upload className="size-4" aria-hidden="true" />}
            onClick={() => inputRef.current?.click()}
          >
            {current ? "Смени логото" : "Качи лого"}
          </Button>
          {current && !uploading ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm">
                  Премахни логото
                </Button>
              }
              title="Премахни логото"
              description="Вместо логото ще се показва първата буква от името."
              confirmLabel="Премахни"
              onConfirm={async () => {
                const result = await removeDealerLogoAction();
                if (!result.ok) {
                  setError(result.error);
                  return true;
                }
                setOverride(null);
              }}
            />
          ) : null}
        </div>
        {error ? <FieldError id="dealer-logo-error" message={error} /> : <FieldHint id="dealer-logo-hint">JPEG, PNG, WebP или AVIF до 8 MB. Квадратно изображение изглежда най-добре.</FieldHint>}
      </div>
    </div>
  );
}
