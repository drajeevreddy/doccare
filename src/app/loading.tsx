import { HeartPulse } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <HeartPulse className="h-5 w-5 text-white animate-pulse" />
        </div>
        <p className="text-sm text-secondary animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
