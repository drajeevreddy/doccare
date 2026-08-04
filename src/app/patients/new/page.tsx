"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createPatient } from "@/lib/queries";
import { ArrowLeft, Save, UserPlus } from "lucide-react";

const genderOptions = ["male", "female", "other"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    blood_group: "",
    height_cm: "",
    weight_kg: "",
    occupation: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    insurance_provider: "",
    insurance_id: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.date_of_birth) {
      toast.error("First name, last name, and date of birth are required");
      return;
    }
    setLoading(true);
    try {
      await createPatient({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zip_code: form.zip_code || undefined,
        blood_group: form.blood_group || undefined,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        occupation: form.occupation || undefined,
        emergency_contact_name: form.emergency_contact_name || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
        insurance_provider: form.insurance_provider || undefined,
        insurance_id: form.insurance_id || undefined,
      });
      toast.success("Patient registered successfully!");
      router.push("/patients");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to register patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/patients" className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold text-primary">Register New Patient</h1>
          </div>
          <p className="text-sm text-secondary mt-1">Enter patient details to create a new record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="First Name *" placeholder="Enter first name" value={form.first_name}
                onChange={(e) => updateField("first_name", e.target.value)} required />
              <Input label="Last Name *" placeholder="Enter last name" value={form.last_name}
                onChange={(e) => updateField("last_name", e.target.value)} required />
              <Input label="Date of Birth *" type="date" value={form.date_of_birth}
                onChange={(e) => updateField("date_of_birth", e.target.value)} required />
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Gender</label>
                <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Select gender</option>
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
              <Input label="Phone" type="tel" placeholder="+91 98765 43210" value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)} />
              <Input label="Email" type="email" placeholder="patient@example.com" value={form.email}
                onChange={(e) => updateField("email", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Address" placeholder="Street address" className="sm:col-span-2" value={form.address}
                onChange={(e) => updateField("address", e.target.value)} />
              <Input label="City" placeholder="City" value={form.city}
                onChange={(e) => updateField("city", e.target.value)} />
              <Input label="State" placeholder="State" value={form.state}
                onChange={(e) => updateField("state", e.target.value)} />
              <Input label="ZIP Code" placeholder="ZIP code" value={form.zip_code}
                onChange={(e) => updateField("zip_code", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Blood Group</label>
                <select value={form.blood_group} onChange={(e) => updateField("blood_group", e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Select blood group</option>
                  {bloodGroupOptions.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <Input label="Height (cm)" type="number" placeholder="e.g. 170" value={form.height_cm}
                onChange={(e) => updateField("height_cm", e.target.value)} />
              <Input label="Weight (kg)" type="number" placeholder="e.g. 70" value={form.weight_kg}
                onChange={(e) => updateField("weight_kg", e.target.value)} />
              <Input label="Occupation" placeholder="Occupation" value={form.occupation}
                onChange={(e) => updateField("occupation", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Contact Name" placeholder="Full name" value={form.emergency_contact_name}
                onChange={(e) => updateField("emergency_contact_name", e.target.value)} />
              <Input label="Contact Phone" type="tel" placeholder="+91 98765 43210" value={form.emergency_contact_phone}
                onChange={(e) => updateField("emergency_contact_phone", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insurance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Insurance Provider" placeholder="Provider name" value={form.insurance_provider}
                onChange={(e) => updateField("insurance_provider", e.target.value)} />
              <Input label="Insurance ID" placeholder="Policy number" value={form.insurance_id}
                onChange={(e) => updateField("insurance_id", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/patients">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" loading={loading}>
            <Save className="h-4 w-4 mr-1" />
            {loading ? "Registering..." : "Register Patient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
