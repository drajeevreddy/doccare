"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateAge, calculateBMI } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  HeartPulse,
  Pill,
  Plus,
  Save,
  Send,
  Stethoscope,
  User,
  Pen,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { getPatientById, saveSOAPNotes, getMedicines, getLabTests } from "@/lib/queries";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  blood_group: string;
  height_cm: number;
  weight_kg: number;
  diagnosis: string;
}

interface MedicineEntry {
  name: string;
  isCustom: boolean;
  dosage: string;
  frequency: string;
  duration: string;
}

interface LabTest {
  id: string;
  name: string;
}

const dosageOptions = ["500mg", "850mg", "1000mg", "10mg", "20mg", "40mg", "5mg", "25mg"];
const frequencyOptions = ["Once daily", "Twice daily", "Three times daily", "Before meals", "After meals", "At bedtime", "As needed"];

export default function ConsultationWorkspace() {
  const params = useParams();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [medicines, setMedicines] = useState<MedicineEntry[]>([
    { name: "", isCustom: false, dosage: "", frequency: "", duration: "" },
  ]);
  const [customMedicineNames, setCustomMedicineNames] = useState<string[]>([]);
  const [dbMedicines, setDbMedicines] = useState<string[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);

  // Vitals state
  const [vitals, setVitals] = useState({
    bp_systolic: "",
    bp_diastolic: "",
    pulse: "",
    temperature: "",
    glucose: "",
    oxygen_saturation: "",
    respiratory_rate: "",
  });

  const updateVital = (field: string, value: string) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!patientId) return;
    getPatientById(patientId).then((data) => {
      setPatient(data as Patient);
      setLoading(false);
    }).catch(() => setLoading(false));
    getMedicines().then((data) => {
      setDbMedicines((data as any[]).map((m: any) => m.name));
    }).catch(() => {});
    getLabTests().then((data) => {
      setLabTests(data as LabTest[]);
    }).catch(() => {});
  }, [patientId]);

  const allMedicineOptions = [...dbMedicines, ...customMedicineNames.map((n) => `${n} ★`), "Other (Custom)"];

  const updateMedicine = (index: number, field: keyof MedicineEntry, value: string | boolean) => {
    setMedicines((prev) =>
      prev.map((med, i) => {
        if (i !== index) return med;
        const next = { ...med, [field]: value };
        if (field === "name" && value === "Other (Custom)") {
          next.isCustom = true;
          next.name = "";
        }
        return next;
      })
    );
  };

  const addMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      { name: "", isCustom: false, dosage: "", frequency: "", duration: "" },
    ]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const collectCustomNames = () => {
    const customs = medicines
      .filter((m) => m.isCustom && m.name.trim())
      .map((m) => m.name.trim());
    if (customs.length > 0) {
      setCustomMedicineNames((prev) => {
        const unique = customs.filter((c) => !prev.includes(c));
        return [...prev, ...unique];
      });
    }
  };

  const buildVitalsPayload = () => {
    const v: Record<string, any> = {};
    if (vitals.bp_systolic) v.bp_systolic = parseInt(vitals.bp_systolic);
    if (vitals.bp_diastolic) v.bp_diastolic = parseInt(vitals.bp_diastolic);
    if (vitals.pulse) v.pulse = parseInt(vitals.pulse);
    if (vitals.temperature) v.temperature = parseFloat(vitals.temperature);
    if (vitals.glucose) v.glucose = parseInt(vitals.glucose);
    if (vitals.oxygen_saturation) v.oxygen_saturation = parseInt(vitals.oxygen_saturation);
    if (vitals.respiratory_rate) v.respiratory_rate = parseInt(vitals.respiratory_rate);
    return v;
  };

  const handleSave = async () => {
    collectCustomNames();
    setSaving(true);
    try {
      await saveSOAPNotes({
        patient_id: patientId,
        subjective,
        objective,
        assessment,
        plan,
        vitals: buildVitalsPayload(),
      });
      toast.success("SOAP notes saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    collectCustomNames();
    setSaving(true);
    try {
      await saveSOAPNotes({
        patient_id: patientId,
        subjective,
        objective,
        assessment,
        plan,
        vitals: buildVitalsPayload(),
      });
      toast.success("Consultation completed — notes and vitals saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete consultation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] -mx-8 -mb-6 overflow-hidden">
        <div className="w-72 border-r border-border bg-surface p-4 animate-pulse space-y-4">
          <div className="h-12 bg-hover rounded-lg" />
          <div className="h-32 bg-hover rounded-lg" />
          <div className="h-24 bg-hover rounded-lg" />
        </div>
        <div className="flex-1 p-6 space-y-4 animate-pulse">
          <div className="h-8 bg-hover rounded w-48" />
          <div className="h-32 bg-hover rounded-lg" />
          <div className="h-32 bg-hover rounded-lg" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <User className="h-12 w-12 text-secondary/40 mb-4" />
        <h3 className="text-sm font-medium text-primary">Patient not found</h3>
        <p className="text-xs text-secondary mt-1">This patient record does not exist</p>
        <Link href="/consultation">
          <Button variant="outline" size="sm" className="mt-4">Back to Queue</Button>
        </Link>
      </div>
    );
  }

  const p = patient;
  const age = calculateAge(p.date_of_birth);
  const bmi = p.weight_kg && p.height_cm ? calculateBMI(p.weight_kg, p.height_cm) : "--";

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-8 -mb-6 overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border bg-surface overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={`${p.first_name} ${p.last_name}`} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate">{p.first_name} {p.last_name}</p>
            <p className="text-xs text-secondary">{p.id}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-secondary">Patient Details</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-xs text-secondary">Age</span>
              <span className="text-xs font-medium text-primary">{age} yrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-secondary">Gender</span>
              <span className="text-xs font-medium text-primary capitalize">{p.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-secondary">Blood Group</span>
              <span className="text-xs font-medium text-primary">{p.blood_group || "--"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-secondary">BMI</span>
              <span className="text-xs font-medium text-primary">{bmi}</span>
            </div>
          </div>
        </div>

        {/* Vitals Recording */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-secondary flex items-center gap-1">
            <Activity className="h-3 w-3" /> Vitals
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] text-secondary">BP Systolic</label>
              <input type="number" placeholder="120"
                className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={vitals.bp_systolic} onChange={(e) => updateVital("bp_systolic", e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-secondary">BP Diastolic</label>
              <input type="number" placeholder="80"
                className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={vitals.bp_diastolic} onChange={(e) => updateVital("bp_diastolic", e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-secondary">Pulse (bpm)</label>
              <input type="number" placeholder="72"
                className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={vitals.pulse} onChange={(e) => updateVital("pulse", e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-secondary">Temp (&deg;F)</label>
              <input type="number" placeholder="98.6" step="0.1"
                className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={vitals.temperature} onChange={(e) => updateVital("temperature", e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-secondary">Glucose (mg/dL)</label>
              <input type="number" placeholder="100"
                className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={vitals.glucose} onChange={(e) => updateVital("glucose", e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-secondary">SpO2 (%)</label>
              <input type="number" placeholder="98"
                className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={vitals.oxygen_saturation} onChange={(e) => updateVital("oxygen_saturation", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-secondary">Respiratory Rate</label>
              <input type="number" placeholder="16"
                className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={vitals.respiratory_rate} onChange={(e) => updateVital("respiratory_rate", e.target.value)} />
            </div>
          </div>
          {vitals.bp_systolic && vitals.bp_diastolic && (
            <div className="flex items-center gap-1 text-[10px] text-accent">
              <HeartPulse className="h-3 w-3" />
              BP: {vitals.bp_systolic}/{vitals.bp_diastolic}
              {vitals.pulse && ` | Pulse: ${vitals.pulse} bpm`}
              {vitals.glucose && ` | Glucose: ${vitals.glucose}`}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-secondary">Diagnosis</p>
          <span className="text-xs font-medium text-primary">{p.diagnosis || "No diagnosis recorded"}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-primary">Consultation Notes</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} loading={saving}>
              <Save className="h-3.5 w-3.5" /> Save Draft
            </Button>
            <Button size="sm" onClick={handleComplete} disabled={saving} loading={saving}>
              <Send className="h-3.5 w-3.5" /> Complete
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-primary mb-1.5">
              <Activity className="h-4 w-4 text-accent" /> Subjective
            </label>
            <textarea className="w-full min-h-[100px] rounded-lg border border-border bg-surface p-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder="Patient's complaints, history of present illness..." value={subjective} onChange={(e) => setSubjective(e.target.value)} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-primary mb-1.5">
              <Stethoscope className="h-4 w-4 text-accent" /> Objective
            </label>
            <textarea className="w-full min-h-[100px] rounded-lg border border-border bg-surface p-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder="Physical examination findings, vitals..." value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-primary mb-1.5">
              <HeartPulse className="h-4 w-4 text-accent" /> Assessment
            </label>
            <textarea className="w-full min-h-[100px] rounded-lg border border-border bg-surface p-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder="Diagnosis, differential diagnoses..." value={assessment} onChange={(e) => setAssessment(e.target.value)} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-primary mb-1.5">
              <ClipboardList className="h-4 w-4 text-accent" /> Plan
            </label>
            <textarea className="w-full min-h-[100px] rounded-lg border border-border bg-surface p-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder="Treatment plan, follow-up schedule..." value={plan} onChange={(e) => setPlan(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="w-80 shrink-0 border-l border-border bg-surface overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-primary">Prescription</h3>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={addMedicine} title="Add medicine">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {medicines.map((med, i) => (
            <div key={i} className="relative rounded-lg border border-border p-3 space-y-2">
              {medicines.length > 1 && (
                <button
                  onClick={() => removeMedicine(i)}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white text-xs hover:bg-error/80 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              {!med.isCustom ? (
                <select
                  className="w-full h-8 rounded-md border border-border bg-surface px-2 text-sm"
                  value={med.name}
                  onChange={(e) => updateMedicine(i, "name", e.target.value)}
                >
                  <option value="">Select medicine</option>
                  {allMedicineOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
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

              <div className="grid grid-cols-2 gap-1.5">
                <select
                  className="h-7 rounded-md border border-border bg-surface px-1.5 text-xs"
                  value={med.dosage}
                  onChange={(e) => updateMedicine(i, "dosage", e.target.value)}
                >
                  <option value="">Dosage</option>
                  {dosageOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  className="h-7 rounded-md border border-border bg-surface px-1.5 text-xs"
                  value={med.frequency}
                  onChange={(e) => updateMedicine(i, "frequency", e.target.value)}
                >
                  <option value="">Frequency</option>
                  {frequencyOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Duration"
                  className="col-span-2 h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  value={med.duration}
                  onChange={(e) => updateMedicine(i, "duration", e.target.value)}
                />
              </div>

              {med.name && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-primary">{med.name}</span>
                  {med.dosage && <Badge variant="primary">{med.dosage}</Badge>}
                </div>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={addMedicine}>
          <Plus className="h-3.5 w-3.5" /> Add Medicine
        </Button>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-secondary">Lab Orders</p>
          {labTests.length > 0 ? labTests.slice(0, 10).map((test) => (
            <label key={test.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover cursor-pointer">
              <input type="checkbox" className="rounded border-border text-accent" />
              <span className="text-xs text-primary">{test.name}</span>
            </label>
          )) : <p className="text-xs text-secondary px-2 py-1">No lab tests configured</p>}
        </div>
      </div>
    </div>
  );
}
