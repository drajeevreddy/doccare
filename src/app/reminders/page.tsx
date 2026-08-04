"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { Bell, Calendar, CheckCircle2, Clock, Mail, Phone, Send, Smartphone, History, Stethoscope, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAppointments, sendAppointmentReminder, getReminderHistory, updateReminderServerAction } from "@/lib/queries";

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

interface ReminderLog {
  id: string;
  action: string;
  created_at: string;
}

export default function RemindersPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [channel, setChannel] = useState<"email" | "sms" | "both">("both");

  useEffect(() => {
    Promise.all([
      getAppointments(),
      getReminderHistory(),
    ]).then(([appts, logs]) => {
      setAppointments(appts as Appointment[]);
      setReminderLogs(logs as ReminderLog[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = (appointments || []).filter(
    (a) => a.appointment_date >= today && (a.status === "scheduled" || a.status === "checked_in")
  ).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  const todayAppts = upcoming.filter((a) => a.appointment_date === today);
  const futureAppts = upcoming.filter((a) => a.appointment_date > today);

  const remindersSent = reminderLogs.length;

  const handleSendReminder = async (apt: Appointment) => {
    setSendingId(apt.id);
    try {
      const result = await updateReminderServerAction({
        appointmentId: apt.id,
        channel,
      });
      if (result) {
        toast.success(`Reminder sent to ${result.patientName} via ${channel}`);
        getReminderHistory().then((logs) => setReminderLogs(logs as ReminderLog[]));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminder");
    } finally {
      setSendingId(null);
    }
  };

  const getReminderForAppointment = (aptId: string) => {
    return reminderLogs.find((log) => log.action.includes(aptId) || log.action.includes(
      appointments.find((a) => a.id === aptId)?.patient_name || ""
    ));
  };

  const patientName = (apt: Appointment) =>
    apt.patient_name || (apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "Unknown");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Appointment Reminders</h1>
          <p className="text-sm text-secondary">Send and manage appointment reminders for patients</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-surface">
            <button
              onClick={() => setChannel("both")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${channel === "both" ? "bg-accent text-white" : "text-secondary hover:text-primary"}`}
            >
              <MessageSquare className="h-3 w-3" /> All
            </button>
            <button
              onClick={() => setChannel("email")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${channel === "email" ? "bg-accent text-white" : "text-secondary hover:text-primary"}`}
            >
              <Mail className="h-3 w-3" /> Email
            </button>
            <button
              onClick={() => setChannel("sms")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${channel === "sms" ? "bg-accent text-white" : "text-secondary hover:text-primary"}`}
            >
              <Smartphone className="h-3 w-3" /> SMS
            </button>
          </div>
          <Link href="/settings?tab=reminders">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-1" /> Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Upcoming Appointments</p>
            <Calendar className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">{upcoming.length}</p>
          <p className="text-xs text-secondary mt-0.5">{todayAppts.length} today</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Reminders Sent</p>
            <Send className="h-4 w-4 text-success" />
          </div>
          <p className="mt-1 text-xl font-semibold text-success">{remindersSent}</p>
          <p className="text-xs text-secondary mt-0.5">all time</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Appointments Today</p>
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">{todayAppts.length}</p>
          <p className="text-xs text-secondary mt-0.5">need reminders</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Pending Reminders</p>
            <Bell className="h-4 w-4 text-warning" />
          </div>
          <p className="mt-1 text-xl font-semibold text-warning">{upcoming.length}</p>
          <p className="text-xs text-secondary mt-0.5">awaiting send</p>
        </div>
      </div>

      <Tabs tabs={[
        {
          id: "today",
          label: "Today",
          badge: todayAppts.length || undefined,
          content: (
            <Card>
              <CardContent className="p-0">
                {todayAppts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-10 w-10 text-secondary/40 mb-3" />
                    <p className="text-sm text-secondary">No appointments today</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {todayAppts.map((apt) => {
                      const hasReminder = getReminderForAppointment(apt.id);
                      return (
                        <div key={apt.id} className="flex items-center gap-4 px-5 py-4 hover:bg-hover/50 transition-colors">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light shrink-0">
                            <Stethoscope className="h-4 w-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary">{patientName(apt)}</p>
                            <p className="text-xs text-secondary">
                              {apt.appointment_time?.slice(0,5)} &middot; {apt.doctor_name} &middot; {apt.type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasReminder ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                                <CheckCircle2 className="h-3 w-3" /> Sent
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminder(apt)}
                                loading={sendingId === apt.id}
                                disabled={sendingId === apt.id}
                              >
                                <Send className="h-3 w-3 mr-1" /> Send Reminder
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ),
        },
        {
          id: "upcoming",
          label: "Upcoming",
          badge: futureAppts.length || undefined,
          content: (
            <Card>
              <CardContent className="p-0">
                {futureAppts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-10 w-10 text-secondary/40 mb-3" />
                    <p className="text-sm text-secondary">No upcoming appointments</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {futureAppts.map((apt) => {
                      const hasReminder = getReminderForAppointment(apt.id);
                      return (
                        <div key={apt.id} className="flex items-center gap-4 px-5 py-4 hover:bg-hover/50 transition-colors">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light shrink-0">
                            <Calendar className="h-4 w-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary">{patientName(apt)}</p>
                            <p className="text-xs text-secondary">
                              {formatDate(apt.appointment_date)} at {apt.appointment_time?.slice(0,5)} &middot; {apt.doctor_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasReminder ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                                <CheckCircle2 className="h-3 w-3" /> Sent
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminder(apt)}
                                loading={sendingId === apt.id}
                                disabled={sendingId === apt.id}
                              >
                                <Send className="h-3 w-3 mr-1" /> Send
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ),
        },
        {
          id: "history",
          label: "History",
          badge: reminderLogs.length || undefined,
          content: (
            <Card>
              <CardContent className="p-0">
                {reminderLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <History className="h-10 w-10 text-secondary/40 mb-3" />
                    <p className="text-sm text-secondary">No reminders sent yet</p>
                    <p className="text-xs text-secondary mt-1">Reminders will appear here once sent</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {reminderLogs.map((log) => {
                      const actionText = log.action.replace("Reminder sent to ", "");
                      const [patient, ...rest] = actionText.split(" for ");
                      return (
                        <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-hover/50 transition-colors">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-primary">{patient}</p>
                            <p className="text-xs text-secondary">{rest.join(" for ")}</p>
                          </div>
                          <span className="text-[10px] text-secondary/60 shrink-0">
                            {log.created_at ? (() => {
                              try { return new Date(log.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
                              catch { return ""; }
                            })() : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ),
        },
      ]} />
    </div>
  );
}
