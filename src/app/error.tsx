"use client";

import { Button } from "@/components/ui/button";
import { HeartPulse } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center max-w-sm px-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <HeartPulse className="h-6 w-6 text-error" />
        </div>
        <h2 className="text-lg font-semibold text-primary">Something went wrong</h2>
        <p className="mt-2 text-sm text-secondary">
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
