"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, Stethoscope, CheckCircle2, XCircle, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDoctorAvailability, getDoctors, saveDoctorAvailability } from "@/lib/queries";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  status: string;
}

interface AvailabilitySlot {
  id?: string;
  doctor_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Appointment {
  doctor_name: string;
  appointment_time: string;
  status: string;
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function DoctorSchedulePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availability, setAvailability] = useState<Record<string, Record<string, { start: string; end: string; available: boolean }>>>({});
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDoctors(),
      getDoctorAvailability(),
    ]).then(([docs, data]: any) => {
      setDoctors(docs);
      setTodayAppts(data.todayAppointments || []);

      // Build availability map
      const map: Record<string, Record<string, { start: string; end: string; available: boolean }>> = {};
      (data.availability || []).forEach((slot: any) => {
        if (!map[slot.doctor_id]) map[slot.doctor_id] = {};
        map[slot.doctor_id][slot.day_of_week] = {
          start: slot.start_time?.slice(0, 5) || "09:00",
          end: slot.end_time?.slice(0, 5) || "17:00",
          available: true,
        };
      });
      // Set defaults for doctors without availability
      docs.forEach((doc: Doctor) => {
        if (!map[doc.id]) map[doc.id] = {};
        DAYS_OF_WEEK.forEach((day) => {
          if (!map[doc.id][day.key]) {
            map[doc.id][day.key] = { start: "09:00", end: "17:00", available: day.key !== "sunday" };
          }
        });
      });
      setAvailability(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateSlot = (doctorId: string, dayKey: string, field: string, value: any) => {
    setAvailability((prev) => ({
      ...prev,
      [doctorId]: {
        ...prev[doctorId],
        [dayKey]: { ...prev[doctorId]?.[dayKey], [field]: value },
      },
    }));
  };

  const handleSave = async (doctorId: string) => {
    setSaving(doctorId);
    try {
      const slots = availability[doctorId] || {};
      const promises = Object.entries(slots).map(([day, slot]) =>
        saveDoctorAvailability(doctorId, day, slot.start, slot.end, slot.available)
      );
      await Promise.all(promises);
      toast.success("Schedule saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save schedule");
    } finally {
      setSaving(null);
    }
  };

  const getAppointmentsForDoctor = (doctorName: string) => {
    return todayAppts.filter((a) => a.doctor_name === doctorName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-secondary">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Doctor Schedule</h1>
          <p className="text-sm text-secondary">Manage doctor availability and working hours</p>
        </div>
        <Badge>{formatDate(new Date().toISOString())}</Badge>
      </div>

      <div className="space-y-6">
        {doctors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Stethoscope className="h-12 w-12 text-secondary/40 mx-auto mb-3" />
              <p className="text-sm text-secondary">No doctors configured yet</p>
              <p className="text-xs text-secondary mt-1">Add doctors in Settings or via the new patient flow</p>
            </CardContent>
          </Card>
        ) : (
          doctors.map((doctor) => {
            const docSlots = availability[doctor.id] || {};
            const appts = getAppointmentsForDoctor(doctor.name);
            return (
              <Card key={doctor.id} className="overflow-hidden">
                <CardHeader className="border-b border-border bg-hover/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light">
                        <Stethoscope className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle>{doctor.name}</CardTitle>
                        <p className="text-xs text-secondary">{doctor.specialization}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {appts.length > 0 && (
                        <span className="text-xs text-secondary bg-accent-light px-2.5 py-1 rounded-full">
                          {appts.length} today
                        </span>
                      )}
                      <Badge status={doctor.status === "active" ? "active" : "inactive"}>
                        {doctor.status}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleSave(doctor.id)}
                        loading={saving === doctor.id}
                        disabled={saving === doctor.id}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {DAYS_OF_WEEK.map((day) => {
                      const slot = docSlots[day.key] || { start: "09:00", end: "17:00", available: day.key !== "sunday" };
                      const dayAppts = appts.filter((a) => {
                        const dayIndex = new Date().getDay();
                        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                        return dayNames[dayIndex] === day.key;
                      });
                      const isToday = day.key === ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
                      return (
                        <div
                          key={day.key}
                          className={`rounded-xl border p-3 transition-colors ${
                            isToday ? "border-accent/40 bg-accent-light/30" : "border-border"
                          } ${!slot.available ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-primary">{day.label.slice(0, 3)}</span>
                            <button
                              onClick={() => updateSlot(doctor.id, day.key, "available", !slot.available)}
                              className={`p-0.5 rounded transition-colors ${
                                slot.available ? "text-success" : "text-error"
                              }`}
                              title={slot.available ? "Mark unavailable" : "Mark available"}
                            >
                              {slot.available ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          {slot.available ? (
                            <div className="space-y-1.5">
                              <div>
                                <label className="block text-[10px] text-secondary mb-0.5">From</label>
                                <input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) => updateSlot(doctor.id, day.key, "start", e.target.value)}
                                  className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-secondary mb-0.5">To</label>
                                <input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) => updateSlot(doctor.id, day.key, "end", e.target.value)}
                                  className="w-full h-7 rounded-md border border-border bg-surface px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-3">
                              <span className="text-xs text-error">Unavailable</span>
                            </div>
                          )}

                          {dayAppts.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <span className="text-[10px] text-secondary">{dayAppts.length} appointment(s)</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
