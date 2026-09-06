import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      aria-hidden
      {...props}
    />
  );
}

/** Placeholder untuk grid kartu statistik. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder untuk daftar kartu booking. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
