import { Skeleton } from "@/components/ui/skeleton";

// Streams instantly on every in-app navigation while the server does auth and
// data work, so switching pages never feels frozen.
export default function AppLoading() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading page">
      <div className="grid gap-2 border-b border-border pb-5">
        <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded" />
      </div>
      <div className="grid gap-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-2/3 rounded-2xl" />
      </div>
    </div>
  );
}
