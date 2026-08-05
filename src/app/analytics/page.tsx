"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Calendar,
  CreditCard,
  Download,
  FlaskConical,
  Pill,
  TrendingDown,
  TrendingUp,
  Users,
  LineChart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getPatients, getLabOrders, getRevenueReport, getMonthlyStats, getAllActivityLogs, getAppointments } from "@/lib/queries";
import { downloadCSV, EXPORT_CONFIGS } from "@/lib/export-csv";

interface Patient {
  id: string;
  diagnosis: string;
  height_cm: number;
  weight_kg: number;
}

interface LabOrder {
  id: string;
  test_name: string;
  result: string;
  status: string;
  is_abnormal: boolean;
  patients: { first_name: string; last_name: string } | null;
}

interface RevenueMonth {
  month: string;
  year: number;
  revenue: number;
  count: number;
  paid: number;
}

interface MonthlyStats {
  appointments: any[];
  totalPatients: number;
  labOrders: any[];
  prescriptions: number;
}

export default function AnalyticsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueMonth[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ appointments: [], totalPatients: 0, labOrders: [], prescriptions: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPatients(),
      getLabOrders(),
      getRevenueReport(),
      getMonthlyStats(),
      getAllActivityLogs(20),
    ]).then(([p, labs, rev, stats, acts]) => {
      setPatients(p as Patient[]);
      setLabOrders(labs as LabOrder[]);
      setRevenueData(rev as RevenueMonth[]);
      setMonthlyStats(stats as MonthlyStats);
      setActivities(acts as any[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const type1Count = patients.filter(p => p.diagnosis?.toLowerCase().includes("type 1")).length;
  const type2Count = patients.filter(p => p.diagnosis?.toLowerCase().includes("type 2")).length;
  const preDiabetesCount = patients.filter(p => p.diagnosis?.toLowerCase().includes("pre-diabetes")).length;
  const trackedPatients = patients.filter(p => p.height_cm && p.weight_kg).length;

  const completedLabs = labOrders.filter((o: any) => o.status === "completed");
  const abnormalResults = completedLabs.filter((o: any) => o.is_abnormal).length;

  const totalRevenue = revenueData.reduce((s, r) => s + r.revenue, 0);
  const totalInvoices = revenueData.reduce((s, r) => s + r.count, 0);
  const totalPaid = revenueData.reduce((s, r) => s + r.paid, 0);
  const maxRevenue = Math.max(...revenueData.map(r => r.revenue), 1);

  const appointmentCount = monthlyStats.appointments.length;
  const completedAppts = monthlyStats.appointments.filter((a: any) => a.status === "completed").length;
  const cancelledAppts = monthlyStats.appointments.filter((a: any) => a.status === "cancelled").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Reports & Analytics</h1>
          <p className="text-sm text-secondary">Revenue trends, patient outcomes, and clinic performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCSV(EXPORT_CONFIGS.revenue(revenueData))} disabled={revenueData.length === 0}>
            <Download className="h-4 w-4" />
            Revenue CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(EXPORT_CONFIGS.patients(patients))} disabled={patients.length === 0}>
            <Download className="h-4 w-4" />
            Patients CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(EXPORT_CONFIGS.labOrders(labOrders))} disabled={labOrders.length === 0}>
            <Download className="h-4 w-4" />
            Lab CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-hover rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <Tabs tabs={[
          {
            id: "overview",
            label: "Overview",
            badge: totalInvoices || undefined,
            content: (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-secondary">Total Revenue (6mo)</p>
                      <CreditCard className="h-4 w-4 text-accent" />
                    </div>
                    <p className="mt-1 text-xl font-semibold text-primary">{formatCurrency(totalRevenue)}</p>
                    <p className="text-xs text-success mt-0.5">{totalInvoices} invoices, {totalPaid} paid</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-secondary">Patients Registered</p>
                      <Users className="h-4 w-4 text-accent" />
                    </div>
                    <p className="mt-1 text-xl font-semibold text-primary">{monthlyStats.totalPatients}</p>
                    <p className="text-xs text-secondary mt-0.5">total</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-secondary">Appointments</p>
                      <Calendar className="h-4 w-4 text-accent" />
                    </div>
                    <p className="mt-1 text-xl font-semibold text-primary">{appointmentCount}</p>
                    <p className="text-xs text-success mt-0.5">{completedAppts} completed</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-secondary">Lab Tests</p>
                      <FlaskConical className="h-4 w-4 text-accent" />
                    </div>
                    <p className="mt-1 text-xl font-semibold text-primary">{monthlyStats.labOrders.length}</p>
                    <p className="text-xs text-warning mt-0.5">{completedLabs.length} completed</p>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Monthly Revenue</CardTitle>
                      <LineChart className="h-4 w-4 text-secondary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {revenueData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <BarChart3 className="h-10 w-10 text-secondary/40 mb-3" />
                        <p className="text-sm text-secondary">No revenue data yet</p>
                        <p className="text-xs text-secondary mt-1">Revenue data will appear as invoices are created</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Bar chart */}
                        <div className="flex items-end gap-2 h-40">
                          {revenueData.map((r, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] font-medium text-secondary">{formatCurrency(r.revenue)}</span>
                              <div
                                className="w-full rounded-t-md bg-accent transition-all hover:bg-accent/80 cursor-pointer relative group"
                                style={{ height: `${Math.max((r.revenue / maxRevenue) * 100, 4)}%` }}
                              >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                  {r.month} {r.year}: {formatCurrency(r.revenue)} ({r.count} invoices)
                                </div>
                              </div>
                              <span className="text-[10px] text-secondary">{r.month}</span>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {revenueData.map((r, i) => (
                            <div key={i} className="rounded-lg border border-border p-2 text-center">
                              <p className="text-[11px] font-medium text-primary">{r.month} {r.year}</p>
                              <p className="text-sm font-semibold text-accent">{formatCurrency(r.revenue)}</p>
                              <p className="text-[10px] text-secondary">{r.count} inv &middot; {r.paid} paid</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Collection Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueData.length === 0 ? (
                        <p className="text-xs text-secondary text-center py-4">No data</p>
                      ) : (
                        <div className="space-y-3">
                          {revenueData.map((r, i) => {
                            const rate = r.count > 0 ? Math.round((r.paid / r.count) * 100) : 0;
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-primary">{r.month} {r.year}</span>
                                  <span className="text-secondary">{r.paid}/{r.count} paid ({rate}%)</span>
                                </div>
                                <div className="h-2 rounded-full bg-hover overflow-hidden">
                                  <div className={`h-full rounded-full ${rate >= 80 ? "bg-success" : rate >= 50 ? "bg-warning" : "bg-error"}`}
                                    style={{ width: `${rate}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Total Appointments", value: String(appointmentCount), icon: Calendar, color: "accent" },
                          { label: "Completed", value: String(completedAppts), icon: Activity, color: "success" },
                          { label: "Cancelled", value: String(cancelledAppts), icon: TrendingDown, color: "error" },
                          { label: "Prescriptions", value: String(monthlyStats.prescriptions), icon: Pill, color: "accent" },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-lg border border-border bg-surface p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-medium text-secondary">{stat.label}</p>
                              <stat.icon className={`h-3.5 w-3.5 text-${stat.color}`} />
                            </div>
                            <p className={`mt-1 text-lg font-semibold text-${stat.color}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: "clinical",
            label: "Clinical",
            badge: patients.length || undefined,
            content: (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs font-medium text-secondary">Total Patients Tracked</p>
                    <p className="mt-1 text-xl font-semibold text-primary">{patients.length}</p>
                    <p className="text-xs text-success mt-0.5">enrolled patients</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs font-medium text-secondary">Type 2 Diabetes</p>
                    <p className="mt-1 text-xl font-semibold text-primary">{type2Count}</p>
                    <p className="text-xs text-secondary mt-0.5">{patients.length > 0 ? `${Math.round((type2Count / patients.length) * 100)}% of patients` : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs font-medium text-secondary">Completed Lab Tests</p>
                    <p className="mt-1 text-xl font-semibold text-primary">{completedLabs.length}</p>
                    <p className="text-xs text-warning mt-0.5">{abnormalResults} abnormal results</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs font-medium text-secondary">Diagnosis Distribution</p>
                    <p className="mt-1 text-xl font-semibold text-primary">{patients.length > 0 ? "Analyzed" : "—"}</p>
                    <p className="text-xs text-secondary mt-0.5">T1: {type1Count} | T2: {type2Count} | Pre: {preDiabetesCount}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <Card>
                    <CardHeader><CardTitle>Patient Distribution</CardTitle></CardHeader>
                    <CardContent>
                      {patients.length === 0 ? (
                        <p className="text-xs text-secondary text-center py-4">No patients</p>
                      ) : (
                        <div className="space-y-3">
                          {[
                            { label: "Type 1 Diabetes", count: type1Count },
                            { label: "Type 2 Diabetes", count: type2Count },
                            { label: "Pre-diabetes", count: preDiabetesCount },
                            { label: "Other/Unspecified", count: patients.length - type1Count - type2Count - preDiabetesCount },
                          ].filter(item => item.count > 0).map((item) => (
                            <div key={item.label}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-primary">{item.label}</span>
                                <span className="text-secondary">{item.count} patients</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-hover overflow-hidden">
                                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(item.count / patients.length) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Lab Results Summary</CardTitle></CardHeader>
                    <CardContent>
                      {completedLabs.length === 0 ? (
                        <p className="text-xs text-secondary text-center py-4">No completed lab results</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-sm font-medium text-primary">Total Completed Tests</p>
                            <p className="text-xs text-secondary mt-1">{completedLabs.length} results available</p>
                          </div>
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-sm font-medium text-primary">Abnormal Results</p>
                            <p className={`text-xs mt-1 ${abnormalResults > 0 ? "text-error" : "text-success"}`}>
                              {abnormalResults > 0 ? `${abnormalResults} require attention` : "All within normal range"}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Risk Overview</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-sm font-medium text-primary">Patients with BMI Data</p>
                          <p className="text-xs text-secondary mt-1">{trackedPatients} patients tracked</p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-sm font-medium text-primary">HbA1c Lab Orders</p>
                          <p className="text-xs text-secondary mt-1">{labOrders.filter(o => o.test_name?.toLowerCase().includes("hba1c")).length} ordered</p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-sm font-medium text-primary">Fasting Glucose</p>
                          <p className="text-xs text-secondary mt-1">{labOrders.filter(o => o.test_name?.toLowerCase().includes("glucose")).length} ordered</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ),
          },
          {
            id: "activity",
            label: "Activity Log",
            badge: activities.length || undefined,
            content: (
              <Card>
                <CardContent className="p-0">
                  {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Activity className="h-10 w-10 text-secondary/40 mb-3" />
                      <p className="text-sm text-secondary">No activity recorded yet</p>
                      <p className="text-xs text-secondary mt-1">Actions like creating patients, appointments will appear here</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {activities.map((act: any) => (
                        <div key={act.id} className="flex items-center gap-3 px-5 py-3 hover:bg-hover/50 transition-colors">
                          <div className="h-2 w-2 rounded-full bg-accent shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-primary truncate">{act.action}</p>
                            <p className="text-xs text-secondary">{act.user_name || "System"}</p>
                          </div>
                          <span className="text-[10px] text-secondary/60 shrink-0">
                            {act.created_at ? (() => {
                              try { return new Date(act.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
                              catch { return ""; }
                            })() : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
        ]} />
      )}
    </div>
  );
}
