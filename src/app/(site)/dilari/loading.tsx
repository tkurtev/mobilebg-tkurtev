import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page space-y-3 py-6" aria-busy="true" aria-label="Зареждане">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-20" />
      ))}
    </div>
  );
}
