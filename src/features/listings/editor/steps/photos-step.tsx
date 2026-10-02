"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { deleteImageAction, reorderImagesAction } from "../../actions";
import { StepSection } from "../editor-fields";
import type { EditorImage } from "../types";

type Upload = { key: string; name: string; status: "uploading" | "error"; error?: string };

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";
const MAX_EDGE = 2400;

/** Downscales large photos in the browser so uploads stay well under the serverless request limit. */
async function prepareFile(file: File): Promise<Blob> {
  if (file.size < 1.5 * 1024 * 1024 && /jpe?g|webp|png|avif/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}

type PhotosStepProps = {
  listingId: string;
  images: EditorImage[];
  setImages: Dispatch<SetStateAction<EditorImage[]>>;
  maxImages: number;
  error?: string;
};

export function PhotosStep({ listingId, images, setImages, maxImages, error }: PhotosStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadOne(file: File, key: string) {
    try {
      const body = new FormData();
      body.append("file", await prepareFile(file), file.name.replace(/\.[^.]+$/, "") + ".jpg");
      const response = await fetch(`/api/obiavi/${listingId}/snimki`, { method: "POST", body });
      const data: { id?: string; url?: string; thumbUrl?: string; width?: number; height?: number; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok || !data.id || !data.url || !data.thumbUrl) throw new Error(data.error ?? "Снимката не можа да бъде качена.");
      const uploaded: EditorImage = { id: data.id, url: data.url, thumbUrl: data.thumbUrl, width: data.width ?? 0, height: data.height ?? 0 };
      setImages((current) => [...current, uploaded]);
      setUploads((current) => current.filter((upload) => upload.key !== key));
    } catch (uploadError) {
      const text = uploadError instanceof Error && uploadError.message ? uploadError.message : "Снимката не можа да бъде качена.";
      setUploads((current) => current.map((upload) => (upload.key === key ? { ...upload, status: "error", error: text } : upload)));
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    setMessage(null);
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name));
    const room = maxImages - images.length - uploads.filter((upload) => upload.status === "uploading").length;
    if (room <= 0) {
      setMessage(`Можеш да добавиш до ${maxImages} снимки.`);
      return;
    }
    const accepted = files.slice(0, room);
    if (files.length > room) setMessage(`Добавени са само първите ${room} снимки. Максимумът е ${maxImages}.`);
    const queue = accepted.map((file) => ({ file, key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}` }));
    setUploads((current) => [...current, ...queue.map(({ file, key }) => ({ key, name: file.name, status: "uploading" as const }))]);
    const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (next) await uploadOne(next.file, next.key);
      }
    });
    await Promise.all(workers);
  }

  async function persistOrder(next: EditorImage[]) {
    const previous = images;
    setImages(next);
    const result = await reorderImagesAction({ listingId, imageIds: next.map((image) => image.id) });
    if (!result.ok) {
      setImages(previous);
      setMessage(result.error);
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    void persistOrder(next);
  }

  async function remove(image: EditorImage) {
    setImages((current) => current.filter((candidate) => candidate.id !== image.id));
    const result = await deleteImageAction(image.id);
    if (!result.ok) {
      setImages((current) => [...current, image]);
      setMessage(result.error);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length > 0) void addFiles(event.dataTransfer.files);
  }

  return (
    <StepSection title="Снимки" description={`До ${maxImages} снимки. Първата снимка е основна и се показва в резултатите.`}>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}

      <div
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver ? "border-brand bg-brand-soft" : "border-line-strong bg-subtle/50",
        )}
      >
        <ImagePlus className="size-7 text-muted" aria-hidden="true" />
        <p className="text-[15px]">
          <span className="hidden sm:inline">Пусни снимките тук или </span>
          <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-brand hover:underline">
            избери файлове
          </button>
        </p>
        <p className="text-sm text-muted">JPEG, PNG, WebP. До 8 MB на снимка.</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="sr-only"
          data-testid="photo-input"
          aria-label="Избери снимки"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {images.length > 0 || uploads.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Качени снимки">
          {images.map((image, index) => (
            <li
              key={image.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                if (dragIndex !== null) event.preventDefault();
              }}
              onDrop={(event) => {
                if (dragIndex === null) return;
                event.preventDefault();
                event.stopPropagation();
                const next = [...images];
                const [item] = next.splice(dragIndex, 1);
                if (item) next.splice(index, 0, item);
                setDragIndex(null);
                if (dragIndex !== index) void persistOrder(next);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn("overflow-hidden rounded-md border bg-surface", index === 0 ? "border-brand" : "border-line", dragIndex === index && "opacity-50")}
              data-testid="uploaded-photo"
            >
              <div className="relative aspect-[4/3] cursor-grab bg-subtle active:cursor-grabbing">
                <Image src={image.thumbUrl} alt={`Снимка ${index + 1}`} fill unoptimized sizes="240px" className="object-cover" />
                {index === 0 ? <span className="absolute top-1.5 left-1.5 rounded-sm bg-brand px-1.5 py-0.5 text-xs font-medium text-white">Основна</span> : null}
              </div>
              <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                <div className="flex">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-sm p-1.5 text-muted hover:bg-subtle hover:text-ink disabled:opacity-30" aria-label="Премести наляво">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} className="rounded-sm p-1.5 text-muted hover:bg-subtle hover:text-ink disabled:opacity-30" aria-label="Премести надясно">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                  {index > 0 ? (
                    <button type="button" onClick={() => move(index, -index)} className="rounded-sm p-1.5 text-muted hover:bg-subtle hover:text-ink" aria-label="Направи основна" title="Направи основна">
                      <Star className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <button type="button" onClick={() => void remove(image)} className="rounded-sm p-1.5 text-muted hover:bg-danger-soft hover:text-danger" aria-label="Изтрий снимката">
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
          {uploads.map((upload) => (
            <li key={upload.key} className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-md border border-line bg-subtle p-2 text-center text-sm">
              {upload.status === "uploading" ? (
                <>
                  <Spinner className="size-5 text-brand" />
                  <span className="line-clamp-1 text-muted">Качване...</span>
                </>
              ) : (
                <>
                  <span className="line-clamp-2 text-danger">{upload.error}</span>
                  <button type="button" className="text-brand hover:underline" onClick={() => setUploads((current) => current.filter((item) => item.key !== upload.key))}>
                    Скрий
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-muted">
        {images.length} от {maxImages} снимки. Подреждай с плъзгане или със стрелките.
      </p>
    </StepSection>
  );
}
