"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Activity, Calendar, CreditCard, HeartPulse, Stethoscope, TrendingUp, Users, ArrowUpRight, LineChart } from "lucide-react";
import { useEffect, useState } from "react";
import { getAppointments, getDashboardMetrics, getQueue, getRecentActivity, getPatients } from "@/lib/queries";

interface Metric {
  label: string;
  value: string;
  change: string;
  icon: React.ElementType;
  trend: "up" | "down";
}

interface QueueItem {
  id: string;
  token: string;
  patient_name?: string;
  patients: { first_name: string; last_name: string } | null;
  doctor_name: string;
  status: string;
}

interface ActivityItem {
  id: string;
  action: string;
  user_name: string;
  created_at: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "Appointments Today", value: "—", change: "Loading...", icon: Calendar, trend: "up" },
    { label: "Active Patients", value: "—", change: "Loading...", icon: Users, trend: "up" },
    { label: "Revenue Today", value: "—", change: "Loading...", icon: TrendingUp, trend: "up" },
    { label: "Follow-Ups Due", value: "—", change: "Loading...", icon: Activity, trend: "down" },
  ]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Local-time "today" (toISOString uses UTC and can be off by a day in IST).
    const now = new Date();
    const today =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const load = () => {
      Promise.all([
        getDashboardMetrics(),
        getAppointments(today),
        getQueue(),
        getRecentActivity(),
        getPatients(),
      ]).then(([m, appts, q, acts]) => {
        setMetrics([
          { label: "Appointments Today", value: String(m.appointmentsToday), change: "today", icon: Calendar, trend: "up" },
          { label: "Active Patients", value: String(m.totalPatients), change: "total registered", icon: Users, trend: "up" },
          { label: "Revenue Today", value: formatCurrency(m.revenueToday), change: "collected today", icon: TrendingUp, trend: "up" },
          { label: "Follow-Ups Due", value: String(m.followUpsDue), change: "scheduled", icon: Activity, trend: "down" },
        ]);
        setAppointments(appts);
        setQueue(q as QueueItem[]);
        setActivities(acts as ActivityItem[]);
        setLoading(false);
      }).catch(() => setLoading(false));
    };

    load();
    // Auto-refresh every 30s so the dashboard reflects new data without a manual reload.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const inProgress = queue.filter((q) => q.status === "in_consultation").length;
  const waiting = queue.filter((q) => q.status === "waiting" || q.status === "checked_in").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Dashboard</h1>
          <p className="text-sm text-secondary">Welcome back. Here&apos;s your clinic overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">Clinic is active</Badge>
          <span className="text-xs text-secondary">{formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-secondary">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-secondary">{metric.label}</p>
                <p className="text-2xl font-semibold text-primary">{metric.value}</p>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-medium ${metric.trend === "up" ? "text-success" : "text-error"}`}>{metric.change}</span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light">
                <metric.icon className="h-5 w-5 text-accent" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Queue Status</CardTitle>
              <Stethoscope className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Users className="h-8 w-8 text-secondary/40 mb-2" />
                <p className="text-xs text-secondary">No patients in queue</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-hover text-xs font-semibold text-secondary">
                        {item.token}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">
                          {item.patient_name || (item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : "Unknown")}
                        </p>
                        <p className="text-xs text-secondary">{item.doctor_name}</p>
                      </div>
                    </div>
                    <Badge status={item.status as any} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today&apos;s Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-8 w-8 text-secondary/40 mb-2" />
                <p className="text-sm text-secondary">No appointments today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-hover">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-light">
                      <HeartPulse className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">{apt.patient_name || (apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "Patient")}</p>
                    <p className="text-xs text-secondary">{apt.appointment_time?.slice(0, 5)} &middot; {apt.doctor_name}</p>
                    </div>
                    <Badge status={apt.status as any} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Activity className="h-8 w-8 text-secondary/40 mb-2" />
                <p className="text-xs text-secondary">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.slice(0, 6).map((act) => (
                  <div key={act.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-hover">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                      <div>
                        <p className="text-sm text-primary">{act.action}</p>
                        <p className="text-xs text-secondary">{act.user_name || "System"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quick Stats</CardTitle>
              <LineChart className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total Appointments", value: String(appointments.length), change: "today" },
                { label: "In Queue", value: String(waiting), change: "waiting" },
                { label: "In Consultation", value: String(inProgress), change: "now" },
                { label: "Completed", value: String(appointments.filter(a => a.status === "completed").length), change: "today" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-[11px] font-medium text-secondary">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold text-primary">{stat.value}</p>
                  <p className="text-[11px] text-secondary">{stat.change}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
