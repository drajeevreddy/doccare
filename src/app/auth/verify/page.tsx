"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const supabase = createClient();

  const handleResend = async () => {
    if (!email) return;
    setResending(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email sent!");
    }
    setResending(false);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-semibold text-white">DocCare</span>
            <p className="text-sm text-white/60">EMR System</p>
          </div>
        </div>
        <p className="text-sm text-white/40">
          &copy; 2026 DocCare. All rights reserved.
        </p>
      </div>

      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-sm px-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-light">
            <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-primary">Check your email</h2>
          <p className="mt-2 text-sm text-secondary">
            We&apos;ve sent a verification link to
          </p>
          <p className="mt-1 text-sm font-medium text-primary">{email}</p>
          <p className="mt-4 text-xs text-secondary">
            Click the link in the email to verify your account and get started.
          </p>

          <div className="mt-6 space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              loading={resending}
            >
              Resend verification email
            </Button>
            <Link
              href="/auth/login"
              className="block text-sm font-medium text-accent hover:text-accent/80"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-secondary">Loading...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
