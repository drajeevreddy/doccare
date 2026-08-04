"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Users, Clock, Stethoscope, ArrowRight, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getQueueBoard } from "@/lib/queries";

interface QueueItem {
  id: string;
  token: string;
  token_number: number;
  patient_name: string;
  doctor_name: string;
  status: string;
  created_at: string;
}

interface DoctorItem {
  name: string;
  specialization: string;
  status: string;
}

interface QueueBoardData {
  inConsultation: QueueItem[];
  waiting: QueueItem[];
  called: QueueItem[];
  doctors: DoctorItem[];
  totalInQueue: number;
  lastUpdated: string;
}

export default function QueueBoardPage() {
  const [data, setData] = useState<QueueBoardData | null>(null);
  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const result = await getQueueBoard();
      setData(result as QueueBoardData);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const clockInterval = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clockInterval); };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const elapsedMinutes = (createdAt: string) => {
    if (!createdAt) return 0;
    const diff = (time.getTime() - new Date(createdAt).getTime()) / 60000;
    return Math.floor(diff);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/5 to-bg overflow-hidden">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.5s ease-out; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .board-card {
          transition: all 0.3s ease;
        }
        .board-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
        }
        .token-display {
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary">Queue Display Board</h1>
              <p className="text-xs text-secondary">{formatDate(time)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-secondary">
              <Clock className="h-4 w-4" />
              <span className="text-xl font-semibold text-primary tabular-nums tracking-wider">
                {formatTime(time)}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-secondary hover:bg-hover transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {!data ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
              <p className="text-sm text-secondary">Loading queue data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Currently Serving - Hero Section */}
            {data.inConsultation.length > 0 && (
              <div className="animate-slide-up">
                <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
                  Now Serving
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.inConsultation.map((item, i) => (
                    <div
                      key={item.id}
                      className="board-card rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/10 to-accent/5 p-6 pulse-glow"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Badge status="in_progress">In Consultation</Badge>
                        <span className="token-display text-3xl font-bold text-accent">
                          #{item.token || item.token_number}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {item.patient_name || "Unknown"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Stethoscope className="h-4 w-4 text-secondary" />
                        <span className="text-base text-secondary">{item.doctor_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-secondary/70">
                        <Clock className="h-3 w-3" />
                        <span>{elapsedMinutes(item.created_at)} min ago</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Waiting List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                    In Queue ({data.waiting.length + data.called.length})
                  </h2>
                </div>

                {data.waiting.length === 0 && data.called.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-border bg-surface/50">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10 mb-4">
                      <Users className="h-10 w-10 text-success" />
                    </div>
                    <p className="text-2xl font-semibold text-success">Queue is Empty</p>
                    <p className="text-base text-secondary mt-1">No patients currently waiting</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {data.called.map((item) => (
                      <div
                        key={item.id}
                        className="board-card flex items-center gap-5 rounded-xl border-2 border-warning/30 bg-warning/5 p-4"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-warning/20">
                          <span className="token-display text-xl font-bold text-warning">
                            #{item.token || item.token_number}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-primary">{item.patient_name || "Unknown"}</p>
                          <p className="text-sm text-secondary">{item.doctor_name}</p>
                        </div>
                        <Badge status="warning">Called</Badge>
                      </div>
                    ))}
                    {data.waiting.map((item, i) => (
                      <div
                        key={item.id}
                        className="board-card flex items-center gap-5 rounded-xl border border-border bg-surface p-4 hover:border-secondary/50"
                        style={{ animationDelay: `${i * 0.05}s` }}
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-hover">
                          <span className="token-display text-xl font-bold text-secondary">
                            #{item.token || item.token_number}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold text-primary">{item.patient_name || "Unknown"}</p>
                          <p className="text-sm text-secondary">{item.doctor_name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-secondary/50">
                          <Clock className="h-3 w-3" />
                          <span>{elapsedMinutes(item.created_at)} min</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-secondary/30" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Doctor Status Sidebar */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                  Doctors On Duty
                </h2>

                <div className="space-y-3">
                  {data.doctors.length === 0 ? (
                    <p className="text-sm text-secondary text-center py-8">No doctors available</p>
                  ) : (
                    data.doctors.map((doc) => {
                      const consulting = data.inConsultation.filter(
                        (q) => q.doctor_name === doc.name
                      );
                      const assignedWaiting = data.waiting.filter(
                        (q) => q.doctor_name === doc.name
                      );
                      return (
                        <Card key={doc.name}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                                <span className="text-sm font-semibold text-primary">{doc.name}</span>
                              </div>
                              <span className="text-xs text-secondary">{doc.specialization}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-secondary">
                              <span>
                                Serving: <strong className="text-primary">{consulting.length || "—"}</strong>
                              </span>
                              <span>
                                Waiting: <strong className="text-primary">{assignedWaiting.length}</strong>
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Summary Card */}
                <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary">Total in Queue</span>
                        <span className="text-lg font-bold text-primary">{data.totalInQueue}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary">In Consultation</span>
                        <span className="text-lg font-bold text-accent">{data.inConsultation.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary">Waiting</span>
                        <span className="text-lg font-bold text-warning">{data.waiting.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary">Doctors Available</span>
                        <span className="text-lg font-bold text-success">{data.doctors.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-[10px] text-secondary/40 text-center">
                  Auto-refreshes every 10s &middot; Last updated: {new Date(data.lastUpdated).toLocaleTimeString("en-IN")}
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-secondary/60">
            <HeartPulse className="h-3.5 w-3.5 text-accent" />
            <span>DocCare EMR — Queue Display System</span>
          </div>
          <span className="text-xs text-secondary/40">
            Press <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">F11</kbd> for fullscreen
          </span>
        </div>
      </footer>
    </div>
  );
}
