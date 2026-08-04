import { MetricSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-5 w-32 rounded bg-hover" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="h-4 w-24 rounded bg-hover" />
          <div className="h-[240px] rounded bg-hover" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="h-4 w-24 rounded bg-hover" />
          <div className="h-[240px] rounded bg-hover" />
        </div>
      </div>
    </div>
  );
}
