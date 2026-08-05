"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, calculateAge } from "@/lib/utils";
import { downloadPrescriptionPDF, printPrescription } from "@/lib/pdf";
import { Download, Pill, Plus, Printer, Search, Pen, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPrescriptions, createPrescription } from "@/lib/queries";

interface PrescriptionItem {
  id: string;
  patient_name?: string;
  patients: { first_name: string; last_name: string } | null;
  doctors: { first_name: string; last_name: string } | null;
  created_at: string;
  status: string;
  is_active?: boolean;
  diagnosis: string;
}

interface MedicineEntry {
  name: string;
  isCustom: boolean;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const defaultMedicineNames = [
  "Metformin",
  "Atorvastatin",
  "Insulin Glargine",
  "Glimepiride",
  "Sitagliptin",
  "Empagliflozin",
  "Other (Custom)",
];

const dosageOptions = ["500mg", "850mg", "1000mg", "10mg", "20mg", "40mg", "5mg", "25mg", "50mg", "100mg"];
const frequencyOptions = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Before meals",
  "After meals",
  "At bedtime",
  "As needed",
  "Every morning",
  "Every night",
];

export default function PrescriptionsPage() {
  const [search, setSearch] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<MedicineEntry[]>([
    { name: "", isCustom: false, dosage: "", frequency: "", duration: "", instructions: "" },
  ]);
  const [customMedicineNames, setCustomMedicineNames] = useState<string[]>([]);

  useEffect(() => {
    getPrescriptions().then((data) => {
      setPrescriptions(data as PrescriptionItem[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allMedicineOptions = [...defaultMedicineNames, ...customMedicineNames.map((n) => `${n} ★`)];

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const patientName = rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : "";
    const doctorName = rx.doctors ? `${rx.doctors.first_name} ${rx.doctors.last_name}` : "";
    return (
      patientName.toLowerCase().includes(search.toLowerCase()) ||
      rx.id.toLowerCase().includes(search.toLowerCase()) ||
      doctorName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const updateMedicine = (index: number, field: keyof MedicineEntry, value: string | boolean) => {
    const updated = medicines.map((med, i) => {
      if (i !== index) return med;
      const next = { ...med, [field]: value };

      // If user selects "Other (Custom)", switch to custom mode
      if (field === "name" && value === "Other (Custom)") {
        next.isCustom = true;
        next.name = "";
      }

      return next;
    });
    setMedicines(updated);
  };

  const addMedicine = () => {
    setMedicines([...medicines, { name: "", isCustom: false, dosage: "", frequency: "", duration: "", instructions: "" }]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleCreatePrescription = async () => {
    if (!patientName.trim()) {
      toast.error("Please enter a patient name");
      return;
    }
    // Collect custom medicine names for future use
    const customs = medicines
      .filter((m) => m.isCustom && m.name.trim())
      .map((m) => m.name.trim());
    if (customs.length > 0) {
      setCustomMedicineNames((prev) => {
        const unique = customs.filter((c) => !prev.includes(c));
        return [...prev, ...unique];
      });
    }
    try {
      await createPrescription({
        patient_name: patientName,
        diagnosis,
        medicines: medicines.map((m) => ({
          name: m.isCustom ? m.name : m.name.replace(" ★", ""),
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
        })),
      });
      toast.success("Prescription created successfully!");
      setShowNewPrescription(false);
      setPatientName("");
      setDiagnosis("");
      setMedicines([{ name: "", isCustom: false, dosage: "", frequency: "", duration: "", instructions: "" }]);
      // Refresh list
      getPrescriptions().then((data) => setPrescriptions(data as PrescriptionItem[]));
    } catch (err: any) {
      toast.error(err.message || "Failed to create prescription");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Prescriptions</h1>
          <p className="text-sm text-secondary">Manage and generate prescriptions with PDF export</p>
        </div>
        <Button size="sm" onClick={() => setShowNewPrescription(true)}>
          <Plus className="h-4 w-4" />
          New Prescription
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          placeholder="Search prescriptions..."
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Prescriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-hover animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-hover rounded animate-pulse" />
                    <div className="h-3 w-24 bg-hover rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Pill className="h-12 w-12 text-secondary/40 mb-4" />
              <h3 className="text-sm font-medium text-primary">No prescriptions yet</h3>
              <p className="text-xs text-secondary mt-1 mb-4">Create a prescription for a patient</p>
              <Button size="sm" onClick={() => setShowNewPrescription(true)}>
                <Plus className="h-4 w-4" />
                New Prescription
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPrescriptions.map((rx) => {
                const patientName = rx.patient_name || (rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : "Unknown");
                const doctorName = rx.doctors ? `${rx.doctors.first_name} ${rx.doctors.last_name}` : "Unknown";
                // prescriptions has no `status` column — derive it from is_active.
                const rxStatus = rx.status || (rx.is_active === false ? "inactive" : "active");
                return (
                  <div key={rx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-hover/50 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light">
                      <Pill className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">{patientName}</span>
                        <span className="text-xs text-secondary">{rx.id}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-secondary">{doctorName}</span>
                        <span className="text-xs text-secondary">&middot;</span>
                        <span className="text-xs text-secondary">{formatDate(rx.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-secondary hidden sm:block">{rx.diagnosis || "--"}</div>
                    <Badge status={rxStatus as any} />
                    <div className="flex items-center gap-1">
                      <button onClick={() => {
                        try {
                          downloadPrescriptionPDF({
                            prescriptionId: rx.id.slice(0, 8).toUpperCase(),
                            patientName,
                            patientAge: 30,
                            patientGender: "Unknown",
                            doctorName,
                            date: formatDate(rx.created_at),
                            diagnosis: rx.diagnosis || "",
                            medicines: [],
                          });
                        } catch { toast.error("Could not generate PDF"); }
                      }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover" title="Download PDF">
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={() => {
                        try {
                          printPrescription({
                            prescriptionId: rx.id.slice(0, 8).toUpperCase(),
                            patientName,
                            patientAge: 30,
                            patientGender: "Unknown",
                            doctorName,
                            date: formatDate(rx.created_at),
                            diagnosis: rx.diagnosis || "",
                            medicines: [],
                          });
                        } catch { toast.error("Could not generate PDF"); }
                      }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover" title="Print">
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewPrescription} onClose={() => setShowNewPrescription(false)} title="New Prescription" description="Create a new prescription for a patient">
        <DialogContent>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input label="Patient Name" placeholder="Search or type patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            <Input label="Diagnosis" placeholder="Enter diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-primary">Medicines</span>
                <Button variant="outline" size="sm" onClick={addMedicine}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>

              {medicines.map((med, i) => (
                <div key={i} className="relative mb-3 p-3 rounded-lg border border-border">
                  {medicines.length > 1 && (
                    <button
                      onClick={() => removeMedicine(i)}
                      className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white text-xs hover:bg-error/80 transition-colors"
                      title="Remove medicine"
                    >
                      &times;
                    </button>
                  )}

                  {!med.isCustom ? (
                    <select
                      className="col-span-2 h-8 w-full rounded-md border border-border bg-surface px-2 text-sm mb-2"
                      value={med.name}
                      onChange={(e) => updateMedicine(i, "name", e.target.value)}
                    >
                      <option value="">Select medicine</option>
                      {allMedicineOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Type custom medicine name"
                        className="flex-1 h-8 rounded-md border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={med.name}
                        onChange={(e) => updateMedicine(i, "name", e.target.value)}
                        autoFocus
                      />
                      <span className="flex items-center gap-1 text-[10px] text-accent whitespace-nowrap">
                        <Pen className="h-3 w-3" /> Custom
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
                      value={med.dosage}
                      onChange={(e) => updateMedicine(i, "dosage", e.target.value)}
                    >
                      <option value="">Dosage</option>
                      {dosageOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
                      value={med.frequency}
                      onChange={(e) => updateMedicine(i, "frequency", e.target.value)}
                    >
                      <option value="">Frequency</option>
                      {frequencyOptions.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Duration"
                      className="h-8 rounded-md border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={med.duration}
                      onChange={(e) => updateMedicine(i, "duration", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Instructions"
                      className="h-8 rounded-md border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={med.instructions}
                      onChange={(e) => updateMedicine(i, "instructions", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewPrescription(false)}>Cancel</Button>
          <Button onClick={handleCreatePrescription}>Create Prescription</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
