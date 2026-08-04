"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, CheckCircle2, Printer, Users, ArrowRight, Clock, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { checkInPatient, getDoctors } from "@/lib/queries";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  status: string;
}

export default function KioskPage() {
  const [step, setStep] = useState<"name" | "doctor" | "done">("name");
  const [patientName, setPatientName] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoctors().then((data) => setDoctors(data as Doctor[]));
  }, []);

  const activeDoctors = doctors.filter((d) => d.status === "active");

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (activeDoctors.length === 0) {
      toast.error("No doctors available. Please see the reception.");
      return;
    }
    setStep("doctor");
  };

  const handleDoctorSelect = async (doctorName: string) => {
    setSelectedDoctor(doctorName);
    setSaving(true);
    try {
      const result: any = await checkInPatient(patientName.trim(), doctorName);
      if (result) {
        setToken(result.token || "—");
        setStep("done");
        toast.success("You're checked in!");
      }
    } catch (err: any) {
      toast.error(err.message || "Check-in failed. Please see reception.");
      setStep("name");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNew = () => {
    setStep("name");
    setPatientName("");
    setSelectedDoctor("");
    setToken("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/5 to-bg flex items-center justify-center p-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <Card className="w-full max-w-lg shadow-xl border-2 border-accent/20">
        <CardContent className="p-8">
          {step === "name" && (
            <form onSubmit={handleNameSubmit} className="space-y-8 text-center">
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
                    <HeartPulse className="h-10 w-10 text-accent" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-primary">Patient Check-In</h1>
                <p className="text-secondary text-lg">Enter your full name to check in</p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  autoFocus
                  className="w-full h-16 text-2xl text-center rounded-2xl border-2 border-border bg-surface px-6 placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                />
                <Button type="submit" size="lg" className="w-full h-16 text-xl no-print">
                  <ArrowRight className="h-6 w-6 mr-2" /> Continue
                </Button>
              </div>
            </form>
          )}

          {step === "doctor" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                    <Stethoscope className="h-8 w-8 text-accent" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-primary">Select Doctor</h2>
                <p className="text-secondary">Hi <span className="font-semibold text-primary">{patientName}</span>, please select your doctor</p>
              </div>

              <div className="space-y-3">
                {activeDoctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleDoctorSelect(doc.name)}
                    disabled={saving}
                    className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-border bg-surface hover:border-accent hover:bg-accent/5 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-light shrink-0">
                      <Stethoscope className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-semibold text-primary">{doc.name}</p>
                      <p className="text-sm text-secondary">{doc.specialization || "General"}</p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-accent" />
                  </button>
                ))}
              </div>

              <Button variant="ghost" onClick={() => setStep("name")} className="no-print">
                ← Back
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-8 text-center">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-12 w-12 text-success" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-primary">You're Checked In!</h2>
                <p className="text-xl text-secondary">{patientName}</p>
              </div>

              <div className="bg-accent/10 rounded-2xl p-8 border-2 border-accent/20">
                <p className="text-lg text-secondary mb-2">Your Token Number</p>
                <p className="text-7xl font-bold text-accent tracking-wider">{token}</p>
                <p className="text-base text-secondary mt-3">
                  Doctor: <span className="font-semibold text-primary">{selectedDoctor}</span>
                </p>
              </div>

              <div className="text-secondary text-base">
                <Clock className="h-5 w-5 inline mr-1" />
                Please wait for your name to be called
              </div>

              <div className="flex gap-3 no-print">
                <Button variant="outline" onClick={handlePrint} size="lg" className="flex-1 h-14 text-lg">
                  <Printer className="h-5 w-5 mr-2" /> Print Token
                </Button>
                <Button onClick={handleNew} size="lg" className="flex-1 h-14 text-lg">
                  <Users className="h-5 w-5 mr-2" /> New Patient
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
