import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-4 lg:py-6" aria-busy="true" aria-label="Зареждане">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  );
}
