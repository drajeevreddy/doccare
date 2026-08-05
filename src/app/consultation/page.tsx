"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, ArrowRight, Clock, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getQueue } from "@/lib/queries";

interface QueueItem {
  id: string;
  patient_id: string;
  patient_name?: string;
  patients: { first_name: string; last_name: string } | null;
  doctor_name: string;
  token: string;
  status: string;
  vitals?: { bp?: string; pulse?: string; glucose?: string };
}

export default function ConsultationPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQueue().then((data) => {
      setQueue(data as QueueItem[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const waiting = queue.filter((q) => q.status === "waiting" || q.status === "checked_in");
  const inConsultation = queue.filter((q) => q.status === "in_consultation");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-primary">Consultations</h1>
        <p className="text-sm text-secondary">Manage patient consultations and SOAP notes</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Queue</CardTitle>
              <Clock className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-hover animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 bg-hover rounded animate-pulse" />
                      <div className="h-3 w-20 bg-hover rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-10 w-10 text-secondary/40 mb-3" />
                <p className="text-sm text-secondary">Queue is empty</p>
                <p className="text-xs text-secondary mt-1">Patients will appear when checked in</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {queue.map((c) => (
                  <Link
                    key={c.id}
                    href={`/consultation/${c.patient_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-hover/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-hover text-xs font-semibold text-secondary">
                      {c.token}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary">
                        {c.patient_name || (c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "Unknown")}
                      </p>
                      <p className="text-xs text-secondary">{c.doctor_name}</p>
                    </div>
                    <Badge status={c.status as any} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Consultation</CardTitle>
              <Stethoscope className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            {inConsultation.length > 0 ? (
              <div className="space-y-4">
                {inConsultation.map((c) => (
                  <div key={c.id} className="rounded-lg border border-accent bg-accent-light/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.patient_name || (c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "U")} size="lg" />
                        <div>
                          <p className="text-sm font-semibold text-primary">
                            {c.patient_name || (c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "Unknown")}
                          </p>
                          <p className="text-xs text-secondary">{c.doctor_name} &middot; Token {c.token}</p>
                        </div>
                      </div>
                      <Badge status="in_progress">In Consultation</Badge>
                    </div>
                    <Link href={`/consultation/${c.patient_id}`}>
                      <Button size="sm" className="w-full">
                        Open Consultation Workspace
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : queue.length > 0 ? (
              <div className="text-center py-8">
                <Stethoscope className="mx-auto h-12 w-12 text-secondary/40" />
                <h3 className="mt-4 text-sm font-medium text-primary">Patients Waiting</h3>
                <p className="mt-1 text-xs text-secondary">
                  {waiting.length} patient(s) waiting. Select from the queue to start.
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Stethoscope className="mx-auto h-12 w-12 text-secondary/40" />
                <h3 className="mt-4 text-sm font-medium text-primary">No Active Consultation</h3>
                <p className="mt-1 text-xs text-secondary">No patients in the queue yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
