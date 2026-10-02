import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-4 lg:py-6" aria-busy="true" aria-label="Зареждане">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-3 h-8 w-64" />
      <div className="mt-4 grid gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[600px] lg:block" />
        <div className="space-y-2.5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex gap-4 rounded-lg border border-line bg-surface p-3">
              <Skeleton className="aspect-[4/3] w-32 sm:w-56" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
