"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Activity, HeartPulse, Stethoscope, ClipboardList, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllConsultationHistory } from "@/lib/queries";

interface ConsultationRecord {
  id: string;
  patient_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosis: string;
  vitals: Record<string, any>;
  created_at: string;
  patients: { first_name: string; last_name: string } | null;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with_diagnosis" | "with_vitals">("all");

  useEffect(() => {
    getAllConsultationHistory().then((data) => {
      setRecords(data as ConsultationRecord[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    const patientName = r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : "";
    const matchesSearch = patientName.toLowerCase().includes(search.toLowerCase()) ||
      (r.assessment || "").toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "with_diagnosis") return !!r.assessment;
    if (filter === "with_vitals") return r.vitals && Object.keys(r.vitals).length > 0;
    return true;
  });

  const hasVitals = (r: ConsultationRecord) => r.vitals && Object.keys(r.vitals).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Consultation History</h1>
          <p className="text-sm text-secondary">Review past patient consultations and clinical notes</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by patient or diagnosis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Activity className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Records</option>
          <option value="with_diagnosis">With Diagnosis</option>
          <option value="with_vitals">With Vitals</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-hover rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ClipboardList className="h-12 w-12 text-secondary/40 mb-4" />
              <p className="text-sm text-secondary">No consultation records found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((record) => {
                const patientName = record.patients
                  ? `${record.patients.first_name} ${record.patients.last_name}`
                  : "Unknown Patient";
                return (
                  <div key={record.id} className="px-5 py-4 hover:bg-hover/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light shrink-0">
                          <Stethoscope className="h-4 w-4 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/patients/${record.patient_id}`}
                              className="text-sm font-medium text-primary hover:text-accent truncate"
                            >
                              {patientName}
                            </Link>
                            {record.assessment && (
                              <Badge variant="warning">{record.assessment.slice(0, 40)}{record.assessment.length > 40 ? "…" : ""}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-secondary">
                            <span>{formatDate(record.created_at)}</span>
                            {hasVitals(record) && (
                              <>
                                <span className="flex items-center gap-1">
                                  <HeartPulse className="h-3 w-3" />
                                  BP: {record.vitals.bp_systolic || "—"}/{record.vitals.bp_diastolic || "—"}
                                </span>
                                {record.vitals.pulse && <span>Pulse: {record.vitals.pulse}</span>}
                                {record.vitals.glucose && <span>Glucose: {record.vitals.glucose}</span>}
                              </>
                            )}
                          </div>
                          {record.subjective && (
                            <p className="text-xs text-secondary mt-1 line-clamp-2">{record.subjective}</p>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/consultation/${record.patient_id}`}
                        className="text-xs font-medium text-accent hover:text-accent/80 whitespace-nowrap"
                      >
                        Open
                      </Link>
                    </div>
                    {record.plan && (
                      <div className="mt-2 ml-13 pl-3 border-l border-border">
                        <p className="text-xs text-secondary flex items-center gap-1">
                          <FlaskConical className="h-3 w-3" />
                          Plan: {record.plan}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
