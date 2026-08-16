"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Activity, Brain, FlaskConical, HeartPulse, Search, Stethoscope, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPatients, getPatientComparisonData } from "@/lib/queries";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

interface ComparisonData {
  patient: any;
  labComparison: any[];
  latestNote: any;
  previousNote: any;
  allNotes: any[];
  hba1cRecords: any[];
  bloodSugarLogs: any[];
}

function formatValue(lab: any) {
  if (!lab) return "—";
  return `${lab.result || "—"} ${lab.unit || ""}`;
}

function getTrend(latest: any, previous: any) {
  if (!latest?.result || !previous?.result) return null;
  const latestNum = parseFloat(latest.result);
  const prevNum = parseFloat(previous.result);
  if (isNaN(latestNum) || isNaN(prevNum)) return null;
  if (latestNum > prevNum) return "up";
  if (latestNum < prevNum) return "down";
  return "stable";
}

export default function ComparePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getPatients().then((data) => setPatients(data as Patient[]));
  }, []);

  const filteredPatients = patients.filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const loadComparison = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setLoading(true);
    setAiAnalysis("");
    try {
      const data = await getPatientComparisonData(patientId);
      setComparisonData(data as ComparisonData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load comparison");
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async () => {
    if (!comparisonData) return;
    setAiLoading(true);
    try {
      const patientName = comparisonData.patient
        ? `${comparisonData.patient.first_name} ${comparisonData.patient.last_name}`
        : "Patient";
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comparisonData, patientName }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "AI analysis failed");
      }
      setAiAnalysis(result.analysis);
    } catch (err: any) {
      toast.error(err.message || "AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  const patient = comparisonData?.patient;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-primary">Patient Report Comparison</h1>
        <p className="text-sm text-secondary">Compare latest vs previous visit reports (3-month window)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-2 text-xs placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {filteredPatients.slice(0, 20).map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadComparison(p.id)}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedPatientId === p.id ? "bg-accent-light text-accent" : "text-primary hover:bg-hover"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-hover text-xs font-semibold text-secondary">
                    {p.first_name?.[0]}{p.last_name?.[0]}
                  </span>
                  <span className="truncate">{p.first_name} {p.last_name}</span>
                </button>
              ))}
              {filteredPatients.length === 0 && (
                <p className="text-xs text-secondary text-center py-4">No patients found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparison area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {patient ? `${patient.first_name} ${patient.last_name} — Report Comparison` : "Report Comparison"}
              </CardTitle>
              {patient && (
                <Button size="sm" onClick={runAiAnalysis} disabled={aiLoading} loading={aiLoading}>
                  <Brain className="h-3.5 w-3.5 mr-1" /> AI Analysis
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-hover rounded animate-pulse" />
                ))}
              </div>
            ) : !comparisonData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FlaskConical className="h-10 w-10 text-secondary/40 mb-3" />
                <p className="text-sm text-secondary">Select a patient to view comparison</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Lab comparison side-by-side */}
                {comparisonData.labComparison.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-2">Laboratory Results</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left text-xs font-medium text-secondary">Test</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-secondary">Previous</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-secondary">Latest</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-secondary">Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {comparisonData.labComparison.map((lab) => {
                            const trend = getTrend(lab.latest, lab.previous);
                            return (
                              <tr key={lab.test_name}>
                                <td className="px-3 py-2 text-sm font-medium text-primary">{lab.test_name}</td>
                                <td className="px-3 py-2 text-sm text-secondary">{formatValue(lab.previous)}</td>
                                <td className="px-3 py-2 text-sm text-primary">{formatValue(lab.latest)}</td>
                                <td className="px-3 py-2">
                                  {trend === "up" && <Badge variant="warning"><TrendingUp className="h-3 w-3 mr-1" />Increased</Badge>}
                                  {trend === "down" && <Badge variant="success"><TrendingDown className="h-3 w-3 mr-1" />Decreased</Badge>}
                                  {trend === "stable" && <Badge variant="primary">Stable</Badge>}
                                  {trend === null && <span className="text-xs text-secondary">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SOAP note comparison side-by-side */}
                {(comparisonData.latestNote || comparisonData.previousNote) && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-2">Consultation Notes</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs font-medium text-secondary mb-2">Previous Visit</p>
                        {comparisonData.previousNote ? (
                          <>
                            <p className="text-xs text-primary font-medium">{formatDate(comparisonData.previousNote.created_at)}</p>
                            {comparisonData.previousNote.assessment && (
                              <p className="text-xs text-secondary mt-1"><strong>Assessment:</strong> {comparisonData.previousNote.assessment}</p>
                            )}
                            {comparisonData.previousNote.plan && (
                              <p className="text-xs text-secondary mt-1"><strong>Plan:</strong> {comparisonData.previousNote.plan}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-secondary">No previous notes</p>
                        )}
                      </div>
                      <div className="rounded-lg border border-accent/30 bg-accent-light/10 p-3">
                        <p className="text-xs font-medium text-accent mb-2">Latest Visit</p>
                        {comparisonData.latestNote ? (
                          <>
                            <p className="text-xs text-primary font-medium">{formatDate(comparisonData.latestNote.created_at)}</p>
                            {comparisonData.latestNote.assessment && (
                              <p className="text-xs text-secondary mt-1"><strong>Assessment:</strong> {comparisonData.latestNote.assessment}</p>
                            )}
                            {comparisonData.latestNote.plan && (
                              <p className="text-xs text-secondary mt-1"><strong>Plan:</strong> {comparisonData.latestNote.plan}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-secondary">No latest notes</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* HbA1c trend */}
                {comparisonData.hba1cRecords.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-2">HbA1c Trend</h3>
                    <div className="flex items-center gap-2">
                      {comparisonData.hba1cRecords.map((r) => (
                        <Badge key={r.id} variant={r.value > 7 ? "warning" : "success"}>
                          {r.date}: {r.value}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {aiAnalysis && (
                  <div className="rounded-lg border border-accent/30 bg-accent-light/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-accent" />
                      <h3 className="text-sm font-semibold text-primary">AI Analysis</h3>
                    </div>
                    <pre className="whitespace-pre-wrap text-xs text-primary font-sans">{aiAnalysis}</pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
