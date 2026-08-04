"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { formatDate, calculateAge } from "@/lib/utils";
import { Calendar, FlaskConical, HeartPulse, Pill, User, ArrowRight, Clock, Phone, Mail, MapPin, Plus, Stethoscope, Upload, FileText, Download, Trash2, ExternalLink, CalendarClock, Bell, Smartphone, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { getPatientByEmail, getPatientPortalData, getDoctors, bookAppointmentFromPortal, getPortalDocuments, uploadPatientDocument, deletePatientDocument, getPatientPrefs, savePatientNotificationPrefs } from "@/lib/queries";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl, downloadICSFile } from "@/lib/calendar";
import { useAuth } from "@/hooks/use-auth";

interface PortalData {
  patient: any;
  appointments: any[];
  labOrders: any[];
  prescriptions: any[];
}

export default function PortalPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.email) { setLoading(false); return; }

    getPatientByEmail(user.email).then((patient) => {
      if (!patient) { setLoading(false); return; }
      return getPatientPortalData(patient.id).then((portalData) => {
        setData(portalData as PortalData);
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center space-y-4">
          <HeartPulse className="h-12 w-12 text-accent mx-auto animate-pulse" />
          <p className="text-sm text-secondary">Loading your health portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center max-w-sm px-8">
          <HeartPulse className="h-16 w-16 text-accent mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-primary mb-2">Patient Portal</h1>
          <p className="text-sm text-secondary mb-6">Please sign in to access your health records</p>
          <Link href="/auth/login?redirect=/portal">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data?.patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center max-w-sm px-8">
          <User className="h-16 w-16 text-secondary/40 mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-primary mb-2">Patient Not Found</h1>
          <p className="text-sm text-secondary mb-6">No patient record is linked to this account. Please contact your clinic.</p>
          <Link href="/auth/login">
            <Button variant="outline">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Notification preferences state
  const [prefs, setPrefs] = useState<any>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSms, setPrefSms] = useState(false);
  const [prefHoursBefore, setPrefHoursBefore] = useState(24);
  const [prefSecondHours, setPrefSecondHours] = useState(1);

  useEffect(() => {
    if (!user?.email) return;
    getPatientPrefs(user.email).then((result: any) => {
      if (result) {
        setPrefs(result);
        const p = result.preferences;
        setPrefEmail(p.email_notifications ?? true);
        setPrefSms(p.sms_notifications ?? false);
        setPrefHoursBefore(p.reminder_hours_before ?? 24);
        setPrefSecondHours(p.second_reminder_hours ?? 1);
      }
      setPrefsLoading(false);
    }).catch(() => setPrefsLoading(false));
  }, [user]);

  const handleSavePrefs = async () => {
    if (!prefs?.patient?.id) { toast.error("Patient not found"); return; }
    setSavingPrefs(true);
    try {
      await savePatientNotificationPrefs({
        patient_id: prefs.patient.id,
        email_notifications: prefEmail,
        sms_notifications: prefSms,
        reminder_hours_before: prefHoursBefore,
        second_reminder_hours: prefSecondHours,
      });
      toast.success("Notification preferences saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  // Document state
  const [documents, setDocuments] = useState<any[]>([]);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("report");
  const [docFile, setDocFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDocuments = async () => {
    if (!data?.patient?.id) return;
    const docs = await getPortalDocuments(data.patient.id);
    setDocuments(docs as any[]);
  };

  useEffect(() => {
    if (data?.patient?.id) refreshDocuments();
  }, [data?.patient?.id]);

  const handleUploadDocument = async () => {
    if (!docFile || !docName.trim()) {
      toast.error("Please provide a file and name");
      return;
    }
    setUploadingDoc(true);
    try {
      const supabase = createSupabaseClient();
      const fileExt = docFile.name.split(".").pop();
      const filePath = `${data!.patient.id}/${Date.now()}-${docName.replace(/\s+/g, "-")}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("patient_uploads")
        .upload(filePath, docFile);

      if (uploadError) throw uploadError;

      await uploadPatientDocument({
        patient_id: data!.patient.id,
        name: docName,
        file_name: docFile.name,
        file_size: docFile.size,
        file_type: docFile.type,
        category: docCategory,
        storage_path: filePath,
        description: docName,
      });

      toast.success("Document uploaded successfully!");
      setShowUploadDoc(false);
      setDocName("");
      setDocFile(null);
      refreshDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deletePatientDocument(docId);
      toast.success("Document removed");
      refreshDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase.storage
        .from("patient_uploads")
        .download(doc.storage_path);
      if (data) {
        const url = URL.createObjectURL(data);
        window.open(url);
      }
    } catch (err: any) {
      toast.error("Failed to download document");
    }
  };

  const [showBooking, setShowBooking] = useState(false);
  const [doctors, setDoctors] = useState<{id: string; name: string; specialization: string; status: string}[]>([]);
  const [bookingForm, setBookingForm] = useState({ doctor: "", date: "", time: "09:00", type: "Consultation" });
  const [bookingSaving, setBookingSaving] = useState(false);

  useEffect(() => {
    getDoctors().then((data: any) => setDoctors(data.filter((d: any) => d.status === "active"))).catch(() => {});
  }, []);

  const handleBookAppointment = async () => {
    if (!bookingForm.doctor) { toast.error("Please select a doctor"); return; }
    if (!bookingForm.date) { toast.error("Please select a date"); return; }
    setBookingSaving(true);
    try {
      const result = await bookAppointmentFromPortal(
        `${p.first_name} ${p.last_name}`,
        bookingForm.doctor,
        bookingForm.date,
        bookingForm.time,
        bookingForm.type
      );
      if (result) {
        toast.success("Appointment booked! We'll send you a reminder.");
        setShowBooking(false);
        // Refresh portal data
        const portalData = await getPatientPortalData(p.id);
        setData(portalData as PortalData);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment");
    } finally {
      setBookingSaving(false);
    }
  };

  const p = data.patient;
  const upcomingAppts = data.appointments.filter((a: any) => a.status === "scheduled" || a.status === "checked_in");
  const recentLabs = data.labOrders.filter((l: any) => l.status === "completed");
  const activeRx = data.prescriptions.filter((r: any) => r.is_active !== false);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-primary">Patient Portal</h1>
              <p className="text-[10px] text-secondary">DocCare EMR System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-secondary">{p.first_name} {p.last_name}</span>
            <Link href="/auth/login">
              <Button variant="outline" size="sm">Sign Out</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome banner */}          <div className="rounded-xl bg-gradient-to-r from-accent to-blue-600 p-6 text-white flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Welcome, {p.first_name}!</h2>
              <p className="text-blue-100 text-sm mt-1">Here&apos;s your health summary</p>
            </div>
            <Button
              onClick={() => setShowBooking(true)}
              className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30"
            >
              <Plus className="h-4 w-4 mr-1" /> Book Appointment
            </Button>
          </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-semibold text-primary">{upcomingAppts.length}</p>
                <p className="text-xs text-secondary">Upcoming Appointments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <FlaskConical className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-semibold text-primary">{recentLabs.length}</p>
                <p className="text-xs text-secondary">Completed Lab Tests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light">
                <Pill className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-semibold text-primary">{activeRx.length}</p>
                <p className="text-xs text-secondary">Prescriptions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          tabs={[
            {
              id: "appointments",
              label: "Appointments",
              badge: upcomingAppts.length || undefined,
              content: (
                <Card>
                  <CardContent className="p-0">
                    {data.appointments.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-10 w-10 text-secondary/40 mx-auto mb-3" />
                        <p className="text-sm text-secondary">No appointments yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {data.appointments.map((apt: any) => (
                          <div key={apt.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-hover/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light">
                              <Calendar className="h-4 w-4 text-accent" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-primary">{formatDate(apt.appointment_date)} at {apt.appointment_time?.slice(0,5)}</p>
                              <p className="text-xs text-secondary">{apt.doctor_name} &middot; {apt.type}</p>
                            </div>
                            <Badge status={apt.status} />
                            <div className="flex items-center gap-1">
                              <a
                                href={generateGoogleCalendarUrl({
                                  id: apt.id,
                                  title: `Appointment with ${apt.doctor_name}`,
                                  date: apt.appointment_date,
                                  time: apt.appointment_time,
                                  doctorName: apt.doctor_name,
                                  patientName: p.first_name,
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover hover:text-accent transition-colors"
                                title="Add to Google Calendar"
                              >
                                <CalendarClock className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ),
            },
            {
              id: "labs",
              label: "Lab Results",
              badge: recentLabs.length || undefined,
              content: (
                <Card>
                  <CardContent className="p-0">
                    {data.labOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <FlaskConical className="h-10 w-10 text-secondary/40 mx-auto mb-3" />
                        <p className="text-sm text-secondary">No lab tests yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {data.labOrders.map((lab: any) => (
                          <div key={lab.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-hover/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light">
                              <FlaskConical className="h-4 w-4 text-accent" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-primary">{lab.test_name}</p>
                              <p className="text-xs text-secondary">{formatDate(lab.created_at)} &middot; Result: {lab.result || "Pending"}</p>
                            </div>
                            <Badge status={lab.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ),
            },
            {
              id: "prescriptions",
              label: "Prescriptions",
              badge: activeRx.length || undefined,
              content: (
                <Card>
                  <CardContent className="p-0">
                    {data.prescriptions.length === 0 ? (
                      <div className="text-center py-12">
                        <Pill className="h-10 w-10 text-secondary/40 mx-auto mb-3" />
                        <p className="text-sm text-secondary">No prescriptions yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {data.prescriptions.map((rx: any) => (
                          <div key={rx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-hover/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light">
                              <Pill className="h-4 w-4 text-accent" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-primary">{rx.diagnosis || "Prescription"}</p>
                              <p className="text-xs text-secondary">{formatDate(rx.created_at)}</p>
                            </div>
                            <Badge status={rx.is_active !== false ? "active" : "cancelled"} />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ),
            },
            {
              id: "documents",
              label: "Documents",
              badge: documents.length || undefined,
              content: (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>My Documents</CardTitle>
                      <Button size="sm" onClick={() => setShowUploadDoc(true)}>
                        <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {documents.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-10 w-10 text-secondary/40 mx-auto mb-3" />
                        <p className="text-sm text-secondary">No documents yet</p>
                        <p className="text-xs text-secondary mt-1">Upload reports, prescriptions, or imaging results</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowUploadDoc(true)}>
                          <Upload className="h-3.5 w-3.5 mr-1" /> Upload Document
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {documents.map((doc: any) => (
                          <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-hover/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light shrink-0">
                              <FileText className="h-4 w-4 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-primary truncate">{doc.name}</p>
                              <p className="text-xs text-secondary">
                                {doc.category} &middot; {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : "—"} &middot; {formatDate(doc.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover hover:text-accent transition-colors"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover hover:text-error transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ),
            },
            {
              id: "profile",
              label: "My Profile",
              content: (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-secondary mb-1">Name</p>
                          <p className="text-sm font-medium text-primary">{p.first_name} {p.last_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-1">Date of Birth</p>
                          <p className="text-sm font-medium text-primary">{formatDate(p.date_of_birth)} ({calculateAge(p.date_of_birth)} yrs)</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-1">Gender</p>
                          <p className="text-sm font-medium text-primary">{p.gender || "--"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-1">Blood Group</p>
                          <p className="text-sm font-medium text-primary">{p.blood_group || "--"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-1">Phone</p>
                          <p className="text-sm font-medium text-primary">{p.phone || "--"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary mb-1">Email</p>
                          <p className="text-sm font-medium text-primary">{p.email || "--"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Notification Preferences</CardTitle>
                        <Bell className="h-4 w-4 text-secondary" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {prefsLoading ? (
                        <div className="space-y-3">
                          <div className="h-10 bg-hover rounded-lg animate-pulse" />
                          <div className="h-10 bg-hover rounded-lg animate-pulse" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
                                <Mail className="h-4 w-4 text-accent" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-primary">Email Reminders</p>
                                <p className="text-xs text-secondary">Receive appointment reminders via email</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setPrefEmail(!prefEmail)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${prefEmail ? 'bg-accent' : 'bg-border'}`}
                            >
                              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${prefEmail ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
                                <Smartphone className="h-4 w-4 text-accent" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-primary">SMS Reminders</p>
                                <p className="text-xs text-secondary">Receive appointment reminders via SMS</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setPrefSms(!prefSms)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${prefSms ? 'bg-accent' : 'bg-border'}`}
                            >
                              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${prefSms ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">First reminder</label>
                              <select
                                value={prefHoursBefore}
                                onChange={(e) => setPrefHoursBefore(Number(e.target.value))}
                                className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value={2}>2 hours before</option>
                                <option value={6}>6 hours before</option>
                                <option value={12}>12 hours before</option>
                                <option value={24}>24 hours before</option>
                                <option value={48}>2 days before</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-secondary mb-1">Second reminder</label>
                              <select
                                value={prefSecondHours}
                                onChange={(e) => setPrefSecondHours(Number(e.target.value))}
                                className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value={0}>None</option>
                                <option value={1}>1 hour before</option>
                                <option value={2}>2 hours before</option>
                                <option value={6}>6 hours before</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end pt-2">
                            <Button size="sm" onClick={handleSavePrefs} loading={savingPrefs} disabled={savingPrefs}>
                              <Save className="h-3.5 w-3.5 mr-1" /> Save Preferences
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </main>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDoc} onClose={() => setShowUploadDoc(false)}
        title="Upload Document" description="Share a document with your healthcare provider">
        <DialogContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Document Name</label>
              <input
                type="text"
                placeholder="e.g. Blood Report - March 2026"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Category</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="report">Medical Report</option>
                <option value="prescription">Prescription</option>
                <option value="lab_result">Lab Result</option>
                <option value="imaging">Imaging / Radiology</option>
                <option value="consent">Consent Form</option>
                <option value="identification">Identification</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed border-border bg-hover/50 cursor-pointer hover:border-accent hover:bg-accent-light/30 transition-colors"
              >
                {docFile ? (
                  <div className="text-center">
                    <FileText className="h-6 w-6 text-accent mx-auto mb-1" />
                    <p className="text-sm font-medium text-primary">{docFile.name}</p>
                    <p className="text-xs text-secondary">{(docFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-6 w-6 text-secondary/40 mx-auto mb-1" />
                    <p className="text-sm text-secondary">Click to select a file</p>
                    <p className="text-xs text-secondary/60 mt-0.5">PDF, JPG, PNG, DOC — max 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowUploadDoc(false); setDocFile(null); }}>Cancel</Button>
          <Button onClick={handleUploadDocument} disabled={uploadingDoc} loading={uploadingDoc}>
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Book Appointment Dialog */}
      <Dialog open={showBooking} onClose={() => setShowBooking(false)}
        title="Book an Appointment" description="Schedule a new appointment at our clinic">
        <DialogContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-light">
              <User className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-medium text-primary">{p.first_name} {p.last_name}</p>
                <p className="text-xs text-secondary">Patient</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Doctor</label>
              <select
                value={bookingForm.doctor}
                onChange={(e) => setBookingForm((f) => ({ ...f, doctor: e.target.value }))}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a doctor</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.name}>
                    {doc.name} — {doc.specialization}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Date</label>
                <input
                  type="date"
                  value={bookingForm.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBookingForm((f) => ({ ...f, date: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Time</label>
                <input
                  type="time"
                  value={bookingForm.time}
                  onChange={(e) => setBookingForm((f) => ({ ...f, time: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Appointment Type</label>
              <select
                value={bookingForm.type}
                onChange={(e) => setBookingForm((f) => ({ ...f, type: e.target.value }))}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Consultation">Consultation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Review">Review</option>
                <option value="Check-up">Check-up</option>
              </select>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBooking(false)}>Cancel</Button>
          <Button onClick={handleBookAppointment} disabled={bookingSaving} loading={bookingSaving}>
            <Calendar className="h-4 w-4 mr-1" /> Book Appointment
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
