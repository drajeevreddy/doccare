"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Search,
  Stethoscope,
  Users,
  Grid3X3,
  List,
  X,
  CalendarClock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  getAppointments,
  getQueue,
  createAppointment,
  getAppointmentsByMonth,
  cancelAppointment,
  rescheduleAppointment,
  getDoctors,
  checkInPatient,
} from "@/lib/queries";

interface Appointment {
  id: string;
  patient_name?: string;
  patients: { first_name: string; last_name: string } | null;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  type: string;
  status: string;
}

interface QueueItem {
  id: string;
  token: string;
  patients: { first_name: string; last_name: string } | null;
  doctor_name: string;
  status: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  status: string;
}

function getWeekDates(baseDate: Date) {
  const dayOfWeek = baseDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayOffset);
  const weekDays: Date[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d);
  }
  return weekDays;
}

function formatDateKey(d: Date) {
  // Local-time key (toISOString is UTC and can shift the day in IST).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayName(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AppointmentsPage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [monthOffset, setMonthOffset] = useState(0);

  // New appointment form
  const [formPatient, setFormPatient] = useState("");
  const [formDate, setFormDate] = useState(selectedDate);
  const [formTime, setFormTime] = useState("09:00");
  const [formDoctor, setFormDoctor] = useState("");
  const [formType, setFormType] = useState("Consultation");
  const [formSaving, setFormSaving] = useState(false);

  // Cancel confirmation
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Reschedule dialog
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const weekDates = getWeekDates(selectedDateObj);

  const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthDays = getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth());
  const [monthAppointments, setMonthAppointments] = useState<{ appointment_date: string; status: string }[]>([]);

  const refreshAppointments = () => {
    getAppointments(selectedDate).then((data) => setAppointments(data as Appointment[]));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getAppointments(selectedDate), getQueue(), getDoctors()])
      .then(([appts, q, docs]) => {
        setAppointments(appts as Appointment[]);
        setQueue(q as QueueItem[]);
        setDoctors(docs as Doctor[]);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [selectedDate]);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setFormDate(selectedDate);
      setShowNewAppointment(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (viewMode !== "month") return;
    getAppointmentsByMonth(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
      .then((data) => setMonthAppointments(data as any[]))
      .catch(() => {});
  }, [viewMode, monthOffset]);

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDateKey(d));
  };

  const goToToday = () => {
    setSelectedDate(formatDateKey(new Date()));
    setMonthOffset(0);
  };

  const goToDate = (d: Date) => setSelectedDate(formatDateKey(d));

  const waitingCount = queue.filter((q) => q.status === "waiting" || q.status === "checked_in").length;
  const inConsultationCount = queue.filter((q) => q.status === "in_consultation").length;

  const filteredAppointments = appointments.filter((apt) => {
    const patientName = apt.patient_name ||
      (apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "");
    return patientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSchedule = async () => {
    if (!formPatient.trim()) { toast.error("Please enter a patient name"); return; }
    if (!formDoctor) { toast.error("Please select a doctor"); return; }
    setFormSaving(true);
    try {
      await createAppointment({ patient_name: formPatient, appointment_date: formDate, appointment_time: formTime, doctor_name: formDoctor, type: formType });
      toast.success("Appointment scheduled!");
      setShowNewAppointment(false);
      setFormPatient("");
      setFormTime("09:00");
      setFormDoctor("");
      setFormType("Consultation");
      refreshAppointments();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule");
    } finally { setFormSaving(false); }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelAppointment(cancelTarget.id);
      toast.success("Appointment cancelled");
      setCancelTarget(null);
      refreshAppointments();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    } finally { setCancelling(false); }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    setRescheduling(true);
    try {
      await rescheduleAppointment(rescheduleTarget.id, rescheduleDate, rescheduleTime);
      toast.success("Appointment rescheduled!");
      setRescheduleTarget(null);
      refreshAppointments();
    } catch (err: any) {
      toast.error(err.message || "Failed to reschedule");
    } finally { setRescheduling(false); }
  };

  const handleDateClick = (d: Date | null) => {
    if (!d) return;
    setSelectedDate(formatDateKey(d));
    setViewMode("week");
  };

  const getAppointmentsForDay = (d: Date) => {
    const dateStr = formatDateKey(d);
    return monthAppointments.filter((a) => a.appointment_date === dateStr);
  };

  const activeDoctors = doctors.filter((d) => d.status === "active");
  const doctorOptions = activeDoctors.length > 0
    ? activeDoctors.map((d) => d.name)
    : ["Dr. Sharma", "Dr. Verma"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Appointments</h1>
          <p className="text-sm text-secondary">Schedule and manage patient appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "month" ? "default" : "outline"} size="sm"
            onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}>
            {viewMode === "month" ? <><List className="h-4 w-4 mr-1" /> Week View</> : <><Grid3X3 className="h-4 w-4 mr-1" /> Month View</>}
          </Button>
          <Button size="sm" onClick={() => { setFormDate(selectedDate); setShowNewAppointment(true); }}>
            <Plus className="h-4 w-4" /> New Appointment
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm"
            onClick={() => { if (viewMode === "month") setMonthOffset(monthOffset - 1); else navigateDate(-1); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-primary min-w-[140px] text-center">
            {viewMode === "month"
              ? `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`
              : formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <Button variant="ghost" size="icon-sm"
            onClick={() => { if (viewMode === "month") setMonthOffset(monthOffset + 1); else navigateDate(1); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
      </div>

      {viewMode === "month" ? (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {dayHeaders.map((h) => (
                <div key={h} className="text-center text-[11px] font-medium text-secondary py-2">{h}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="aspect-square p-1" />;
                const dateStr = formatDateKey(d);
                const isToday = dateStr === formatDateKey(today);
                const isSelected = dateStr === selectedDate;
                const count = getAppointmentsForDay(d).length;
                return (
                  <button key={dateStr} onClick={() => handleDateClick(d)}
                    className={`aspect-square p-1 rounded-lg border transition-colors relative ${isSelected ? "border-accent bg-accent-light" : isToday ? "border-accent/50 bg-accent-light/30" : "border-transparent hover:bg-hover"}`}>
                    <span className={`text-sm font-medium ${isToday ? "text-accent" : "text-primary"}`}>{d.getDate()}</span>
                    {count > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {count <= 3 ? Array.from({ length: count }).map((_, ci) =>
                          <div key={ci} className="h-1.5 w-1.5 rounded-full bg-accent" />
                        ) : <span className="text-[10px] font-medium text-accent">{count}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-2">
          {weekDates.map((day) => {
            const dateStr = formatDateKey(day);
            const isSelected = dateStr === selectedDate;
            return (
              <button key={dateStr} onClick={() => goToDate(day)}
                className={`flex flex-1 flex-col items-center rounded-lg border p-3 transition-colors ${isSelected ? "border-accent bg-accent-light" : "border-border hover:bg-hover"}`}>
                <span className="text-[11px] font-medium text-secondary">{formatDayName(day)}</span>
                <span className={`mt-1 text-base font-semibold ${isSelected ? "text-accent" : "text-primary"}`}>{day.getDate()}</span>
                <span className="text-[10px] text-secondary mt-0.5">{isSelected ? `${appointments.length} slots` : "—"}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Schedule</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
                <input type="text" placeholder="Search..." className="h-8 rounded-md border border-border bg-transparent pl-8 pr-2 text-xs placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-16 bg-hover rounded animate-pulse" />
                    <div className="h-10 w-10 rounded-full bg-hover animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-hover rounded animate-pulse" />
                      <div className="h-3 w-24 bg-hover rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-10 w-10 text-secondary/40 mb-3" />
                <p className="text-sm text-secondary">No appointments scheduled for this date</p>
                <Button variant="outline" size="sm" className="mt-4"
                  onClick={() => { setFormDate(selectedDate); setShowNewAppointment(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Appointment
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredAppointments.map((apt) => {
                  const patientName = apt.patient_name ||
                    (apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "Unknown Patient");
                  const isActive = apt.status === "scheduled" || apt.status === "checked_in";
                  return (
                    <div key={apt.id} className="flex items-center gap-4 px-5 py-3 hover:bg-hover/50 transition-colors">
                      <div className="w-16 text-center">
                        <p className="text-sm font-semibold text-primary">{apt.appointment_time?.slice(0, 5) || "--:--"}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light shrink-0">
                        <Stethoscope className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary">{patientName}</p>
                        <p className="text-xs text-secondary">{apt.doctor_name} &middot; {apt.type}</p>
                      </div>
                      <Badge status={apt.status as any} />
                      <a
                        href={`/api/appointments/${apt.id}/ics`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover hover:text-accent transition-colors"
                        title="Download .ics (Add to Calendar)"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {apt.status === "scheduled" && (
                        <button
                          onClick={async () => {
                            try {
                              await checkInPatient(patientName, apt.doctor_name);
                              toast.success(`${patientName} checked in!`);
                              refreshAppointments();
                              getQueue().then((data) => setQueue(data as QueueItem[]));
                            } catch (err: any) {
                              toast.error(err.message || "Failed to check in");
                            }
                          }}
                          className="text-xs font-medium text-accent hover:text-accent/80 px-2.5 py-1 rounded-md border border-accent/30 hover:bg-accent-light transition-colors"
                          title="Check In Patient"
                        >
                          Check In
                        </button>
                      )}
                      {isActive && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setRescheduleTarget(apt); setRescheduleDate(apt.appointment_date); setRescheduleTime(apt.appointment_time); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover hover:text-accent transition-colors"
                            title="Reschedule">
                            <CalendarClock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCancelTarget(apt)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover hover:text-error transition-colors"
                            title="Cancel">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Queue</CardTitle>
                <Users className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Waiting</span>
                  <span className="text-sm font-semibold text-primary">{waitingCount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">In Consultation</span>
                  <span className="text-sm font-semibold text-primary">{inConsultationCount}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Completed Today</span>
                  <span className="text-sm font-semibold text-primary">
                    {appointments.filter((a) => a.status === "completed").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Doctor Availability</CardTitle>
                <Clock className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              {doctors.length === 0 ? (
                <p className="text-xs text-secondary text-center py-4">No doctors configured yet</p>
              ) : (
                <div className="space-y-3">
                  {activeDoctors.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        <span className="text-sm text-primary">{doc.name}</span>
                      </div>
                      <span className="text-xs text-secondary">{doc.specialization}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">Total Appointments</span>
                  <span className="text-sm font-semibold text-primary">{appointments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">Cancelled</span>
                  <span className="text-sm font-semibold text-error">
                    {appointments.filter((a) => a.status === "cancelled").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">Rescheduled</span>
                  <span className="text-sm font-semibold text-warning">
                    {appointments.filter((a) => a.status === "rescheduled").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onClose={() => setShowNewAppointment(false)}
        title="New Appointment" description="Schedule a new patient appointment">
        <DialogContent>
          <div className="space-y-4">
            <Input label="Patient Name" placeholder="Enter patient name" value={formPatient} onChange={(e) => setFormPatient(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Time</label>
                <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Doctor</label>
              <select value={formDoctor} onChange={(e) => setFormDoctor(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select doctor</option>
                {doctorOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="Consultation">Consultation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Review">Review</option>
                <option value="New Patient">New Patient</option>
              </select>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewAppointment(false)}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={formSaving} loading={formSaving}>Schedule</Button>
        </DialogFooter>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)}
        title="Cancel Appointment" description="Are you sure you want to cancel this appointment?">
        <DialogContent>
          {cancelTarget && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-error/5 border border-error/20">
              <AlertTriangle className="h-8 w-8 text-error shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary">
                  {cancelTarget.patient_name || (cancelTarget.patients ? `${cancelTarget.patients.first_name} ${cancelTarget.patients.last_name}` : "Unknown")}
                </p>
                <p className="text-xs text-secondary">{cancelTarget.appointment_time?.slice(0, 5)} &middot; {cancelTarget.doctor_name} &middot; {formatDate(cancelTarget.appointment_date)}</p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep Appointment</Button>
          <Button variant="danger" onClick={handleCancel} disabled={cancelling} loading={cancelling}>
            Cancel Appointment
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)}
        title="Reschedule Appointment" description="Choose a new date and time for this appointment">
        <DialogContent>
          {rescheduleTarget && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-hover">
                <p className="text-sm font-medium text-primary">
                  {rescheduleTarget.patient_name || (rescheduleTarget.patients ? `${rescheduleTarget.patients.first_name} ${rescheduleTarget.patients.last_name}` : "Unknown")}
                </p>
                <p className="text-xs text-secondary">Current: {formatDate(rescheduleTarget.appointment_date)} at {rescheduleTarget.appointment_time?.slice(0, 5)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">New Date</label>
                  <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">New Time</label>
                  <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRescheduleTarget(null)}>Cancel</Button>
          <Button onClick={handleReschedule} disabled={rescheduling} loading={rescheduling}>Reschedule</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
