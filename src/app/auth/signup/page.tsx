"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const roleOptions = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "receptionist", label: "Receptionist" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "accountant", label: "Accountant" },
  { value: "clinic_admin", label: "Clinic Admin" },
];

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("doctor");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
        emailRedirectTo: `${window.location.origin}/auth/verify`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! Check your email to verify.");
    router.push("/auth/verify?email=" + encodeURIComponent(email));
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
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Join the platform
          </h1>
          <p className="text-base text-white/60 max-w-md">
            Create your account and start managing your clinic with our
            comprehensive EMR system.
          </p>
        </div>
        <p className="text-sm text-white/40">
          &copy; 2026 DocCare. All rights reserved.
        </p>
      </div>

      <div className="flex w-full items-center justify-center lg:w-1/2">
        <div className="w-full max-w-sm px-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-primary">Create account</h2>
            <p className="mt-1 text-sm text-secondary">
              Fill in the details below to get started
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Dr. John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="doctor@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={roleOptions}
              placeholder="Select role"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-secondary">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-accent hover:text-accent/80"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
