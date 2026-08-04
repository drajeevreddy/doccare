"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MetricSkeleton } from "@/components/ui/skeleton";
import { calculateAge, formatDate } from "@/lib/utils";
import { ChevronDown, Download, Filter, Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPatients } from "@/lib/queries";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  blood_group: string;
  last_visit: string;
  status: string;
  diagnosis: string;
}

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatients().then((data) => {
      setPatients(data as Patient[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredPatients = patients.filter(
    (p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone && p.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Patients</h1>
          <p className="text-sm text-secondary">
            Manage patient records and medical history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={patients.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href="/patients/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon-sm">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Patients table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-hover animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-hover rounded animate-pulse" />
                  <div className="h-3 w-32 bg-hover rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Users className="h-12 w-12 text-secondary/40 mb-4" />
            <h3 className="text-sm font-medium text-primary">No patients yet</h3>
            <p className="text-xs text-secondary mt-1 mb-4">
              Add your first patient to get started
            </p>
            <Link href="/patients/new">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add Patient
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Age/Gender</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Blood Group</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Diagnosis</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Last Visit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-hover/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/patients/${patient.id}`} className="flex items-center gap-3">
                          <Avatar name={`${patient.first_name} ${patient.last_name}`} size="md" />
                          <span className="text-sm font-medium text-primary">
                            {patient.first_name} {patient.last_name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">{patient.id}</td>
                      <td className="px-4 py-3 text-sm text-secondary">
                        {calculateAge(patient.date_of_birth)} yrs /{" "}
                        {patient.gender === "male" ? "M" : "F"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium text-secondary">
                          {patient.blood_group || "--"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">{patient.phone}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-primary">{patient.diagnosis || "--"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">
                        {patient.last_visit ? formatDate(patient.last_visit) : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={patient.status as any} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/patients/${patient.id}`} className="text-xs font-medium text-accent hover:text-accent/80">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-secondary">
                Showing {filteredPatients.length} of {patients.length} patients
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
