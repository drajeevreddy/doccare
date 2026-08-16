"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { Tabs } from "@/components/ui/tabs";
import { UserPlus, Trash2, Stethoscope, Bell, Calendar, Clock, CheckCircle2, Mail, Smartphone, Zap, RefreshCw, History, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDoctors, addDoctor, removeDoctor, getAppointments, getAutoReminderConfig, saveAutoReminderConfig, getScheduledReminderStats, processScheduledReminders, getClinicSettings, updateClinicSettings } from "@/lib/queries";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  status: string;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "--";
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialization, setDoctorSpecialization] = useState("");
  const [doctorSaving, setDoctorSaving] = useState(false);

  // Clinic settings state
  const [clinicName, setClinicName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicState, setClinicState] = useState("");
  const [clinicZip, setClinicZip] = useState("");
  const [gstPercentage, setGstPercentage] = useState(0);
  const [consultationFee, setConsultationFee] = useState(0);
  const [followupFee, setFollowupFee] = useState(0);
  const [currency, setCurrency] = useState("INR");
  const [apptDuration, setApptDuration] = useState(30);
  const [nvidiaApiKey, setNvidiaApiKey] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Reminder state
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  // Auto-reminder state
  const [autoReminderEnabled, setAutoReminderEnabled] = useState(false);
  const [autoReminderChannel, setAutoReminderChannel] = useState("both");
  const [autoReminderFirstHours, setAutoReminderFirstHours] = useState(24);
  const [autoReminderSecondHours, setAutoReminderSecondHours] = useState(1);
  const [autoReminderStartHour, setAutoReminderStartHour] = useState(9);
  const [autoReminderEndHour, setAutoReminderEndHour] = useState(20);
  const [autoReminderSaving, setAutoReminderSaving] = useState(false);
  const [reminderStats, setReminderStats] = useState<any>(null);
  const [runningManual, setRunningManual] = useState(false);

  const refreshDoctors = () => {
    getDoctors().then((data) => setDoctors(data as Doctor[]));
  };

  useEffect(() => {
    getDoctors().then((data) => {
      setDoctors(data as Doctor[]);
      setLoadingDoctors(false);
    }).catch(() => setLoadingDoctors(false));

    // Load clinic settings
    getClinicSettings().then((s: any) => {
      if (s) {
        setSettingsId(s.id);
        setClinicName(s.clinic_name || "");
        setLicenseNumber(s.license_number || "");
        setClinicPhone(s.phone || "");
        setClinicEmail(s.email || "");
        setClinicAddress(s.address || "");
        setClinicCity(s.city || "");
        setClinicState(s.state || "");
        setClinicZip(s.zip_code || "");
        setGstPercentage(s.gst_percentage ?? 0);
        setConsultationFee(s.consultation_fee ?? 0);
        setFollowupFee(s.followup_fee ?? 0);
        setCurrency(s.currency || "INR");
        setApptDuration(s.appointment_duration ?? 30);
        setNvidiaApiKey(s.nvidia_api_key || "");
      }
    }).catch(() => {});

    // Fetch upcoming appointments for reminders
    const today = new Date().toISOString().split("T")[0];
    getAppointments().then((appts: any) => {
      const upcoming = (appts || []).filter((a: any) =>
        a.appointment_date >= today && (a.status === "scheduled" || a.status === "checked_in")
      ).slice(0, 10);
      setUpcomingAppointments(upcoming);
    }).catch(() => {});
  }, []);

  // Load auto-reminder config
  useEffect(() => {
    getAutoReminderConfig().then((config: any) => {
      if (config) {
        setAutoReminderEnabled(config.enabled ?? false);
        setAutoReminderChannel(config.default_channel ?? "both");
        setAutoReminderFirstHours(config.first_reminder_hours ?? 24);
        setAutoReminderSecondHours(config.second_reminder_hours ?? 1);
        setAutoReminderStartHour(config.window_start_hour ?? 9);
        setAutoReminderEndHour(config.window_end_hour ?? 20);
      }
    }).catch(() => {});

    getScheduledReminderStats().then((stats: any) => {
      setReminderStats(stats);
    }).catch(() => {});
  }, []);

  const sendReminder = (apt: any) => {
    toast.success(`Reminder sent to ${apt.patient_name} for ${formatDate(apt.appointment_date)} at ${apt.appointment_time?.slice(0,5)}`);
    // In a real app, this would call an API to send SMS/email
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClinicSettings({
        clinic_name: clinicName,
        license_number: licenseNumber,
        phone: clinicPhone,
        email: clinicEmail,
        address: clinicAddress,
        city: clinicCity,
        state: clinicState,
        zip_code: clinicZip,
        gst_percentage: gstPercentage,
        consultation_fee: consultationFee,
        followup_fee: followupFee,
        currency,
        appointment_duration: apptDuration,
        nvidia_api_key: nvidiaApiKey,
      });
      toast.success("Settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDoctor = async () => {
    if (!doctorName.trim()) { toast.error("Please enter a doctor name"); return; }
    setDoctorSaving(true);
    try {
      await addDoctor(doctorName, doctorSpecialization);
      toast.success("Doctor added successfully!");
      setShowAddDoctor(false);
      setDoctorName("");
      setDoctorSpecialization("");
      refreshDoctors();
    } catch (err: any) {
      toast.error(err.message || "Failed to add doctor");
    } finally {
      setDoctorSaving(false);
    }
  };

  const handleSaveAutoReminder = async () => {
    setAutoReminderSaving(true);
    try {
      await saveAutoReminderConfig({
        enabled: autoReminderEnabled,
        default_channel: autoReminderChannel,
        first_reminder_hours: autoReminderFirstHours,
        second_reminder_hours: autoReminderSecondHours,
        window_start_hour: autoReminderStartHour,
        window_end_hour: autoReminderEndHour,
      });
      toast.success(autoReminderEnabled ? "Auto-reminders enabled!" : "Auto-reminders disabled");
      const stats = await getScheduledReminderStats();
      setReminderStats(stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setAutoReminderSaving(false);
    }
  };

  const handleRunManually = async () => {
    setRunningManual(true);
    try {
      const result = await processScheduledReminders();
      toast.success(`Processed: ${result.sent} reminders sent, ${result.errors} errors`);
      const stats = await getScheduledReminderStats();
      setReminderStats(stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to process");
    } finally {
      setRunningManual(false);
    }
  };

  const handleRemoveDoctor = async (id: string, name: string) => {
    try {
      await removeDoctor(id);
      toast.success(`${name} removed`);
      refreshDoctors();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove doctor");
    }
  };

  const activeDoctors = doctors.filter((d) => d.status === "active");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-primary">Settings</h1>
        <p className="text-sm text-secondary">Manage clinic settings and configurations</p>
      </div>

      <Tabs
        tabs={[
          {
            id: "general",
            label: "General",
            content: (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Clinic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input label="Clinic Name" placeholder="Enter clinic name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
                      <Input label="License Number" placeholder="Enter license number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                      <Input label="Phone" placeholder="+91 1800-123-4567" className="sm:col-span-2" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} />
                      <Input label="Email" type="email" placeholder="info@clinic.com" className="sm:col-span-2" value={clinicEmail} onChange={(e) => setClinicEmail(e.target.value)} />
                      <Input label="Address" className="sm:col-span-2" placeholder="Clinic address" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} />
                      <Input label="City" placeholder="City" value={clinicCity} onChange={(e) => setClinicCity(e.target.value)} />
                      <Input label="State" placeholder="State" value={clinicState} onChange={(e) => setClinicState(e.target.value)} />
                      <Input label="ZIP Code" placeholder="ZIP code" value={clinicZip} onChange={(e) => setClinicZip(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Working Hours</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                      <div key={day} className="flex items-center gap-4">
                        <span className="w-24 text-sm text-primary">{day}</span>
                        <Input type="time" defaultValue="09:00" className="w-32" />
                        <span className="text-sm text-secondary">to</span>
                        <Input type="time" defaultValue="17:00" className="w-32" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSave} loading={saving}>Save Changes</Button>
                </div>
              </div>
            ),
          },
          {
            id: "doctors",
            label: "Doctors",
            badge: activeDoctors.length || undefined,
            content: (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Manage Doctors</CardTitle>
                    <Button size="sm" onClick={() => setShowAddDoctor(true)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Add Doctor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingDoctors ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 bg-hover rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : activeDoctors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <Stethoscope className="h-10 w-10 text-secondary/40 mb-3" />
                      <p className="text-sm text-secondary">No doctors added yet</p>
                      <p className="text-xs text-secondary mt-1 mb-4">Add doctors to manage appointments and assignments</p>
                      <Button size="sm" onClick={() => setShowAddDoctor(true)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Add Doctor
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {activeDoctors.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-hover/50">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-light">
                              <Stethoscope className="h-4 w-4 text-accent" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-primary">{doc.name}</p>
                              <p className="text-xs text-secondary">{doc.specialization || "General"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-success">Active</span>
                            <button
                              onClick={() => handleRemoveDoctor(doc.id, doc.name)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-error/10 hover:text-error transition-colors"
                              title="Remove doctor"
                            >
                              <Trash2 className="h-4 w-4" />
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
            id: "billing",
            label: "Billing",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Tax, Pricing & AI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="GST Percentage" type="number" value={String(gstPercentage)} onChange={(e) => setGstPercentage(Number(e.target.value))} />
                    <Input label="Consultation Fee" type="number" value={String(consultationFee)} onChange={(e) => setConsultationFee(Number(e.target.value))} />
                    <Input label="Follow-up Fee" type="number" value={String(followupFee)} onChange={(e) => setFollowupFee(Number(e.target.value))} />
                    <Input label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                    <Input label="Appointment Duration (min)" type="number" value={String(apptDuration)} onChange={(e) => setApptDuration(Number(e.target.value))} />
                    <Input
                      label="NVIDIA NIM API Key"
                      type="password"
                      placeholder="nvapi-..."
                      value={nvidiaApiKey}
                      onChange={(e) => setNvidiaApiKey(e.target.value)}
                      className="sm:col-span-2"
                    />
                  </div>
                  <p className="text-xs text-secondary">
                    Used for AI-powered report comparison. Get your key from{" "}
                    <a href="https://build.nvidia.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">build.nvidia.com</a>.
                    The AI is grounded in ADA, WHO, KDIGO, and ACC/AHA clinical guidelines.
                  </p>
                  <div className="flex justify-end">
                    <Button onClick={handleSave} loading={saving}>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "reminders",
            label: "Reminders",
            badge: upcomingAppointments.length || undefined,
            content: (
              <div className="space-y-6">
                {/* Auto-Reminder Configuration */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Automated Reminders</CardTitle>
                      <Zap className={`h-4 w-4 ${autoReminderEnabled ? 'text-accent' : 'text-secondary'}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
                          <Zap className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">Auto-Send Reminders</p>
                          <p className="text-xs text-secondary">Automatically send reminders based on patient preferences and timing</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoReminderEnabled(!autoReminderEnabled)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${autoReminderEnabled ? 'bg-accent' : 'bg-border'}`}
                      >
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${autoReminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Default Channel</label>
                        <select
                          value={autoReminderChannel}
                          onChange={(e) => setAutoReminderChannel(e.target.value)}
                          className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="both">Email + SMS</option>
                          <option value="email">Email only</option>
                          <option value="sms">SMS only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Send Window</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={autoReminderStartHour}
                            onChange={(e) => setAutoReminderStartHour(Number(e.target.value))}
                            className="h-8 flex-1 rounded-lg border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 8).map((h) => (
                              <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                            ))}
                          </select>
                          <span className="text-xs text-secondary">to</span>
                          <select
                            value={autoReminderEndHour}
                            onChange={(e) => setAutoReminderEndHour(Number(e.target.value))}
                            className="h-8 flex-1 rounded-lg border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 9).map((h) => (
                              <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">First Reminder</label>
                        <select
                          value={autoReminderFirstHours}
                          onChange={(e) => setAutoReminderFirstHours(Number(e.target.value))}
                          className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value={2}>2 hours before</option>
                          <option value={6}>6 hours before</option>
                          <option value={12}>12 hours before</option>
                          <option value={24}>24 hours before</option>
                          <option value={48}>2 days before</option>
                          <option value={72}>3 days before</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Second Reminder</label>
                        <select
                          value={autoReminderSecondHours}
                          onChange={(e) => setAutoReminderSecondHours(Number(e.target.value))}
                          className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value={0}>None</option>
                          <option value={1}>1 hour before</option>
                          <option value={2}>2 hours before</option>
                          <option value={6}>6 hours before</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-secondary" />
                        {reminderStats && (
                          <div className="flex items-center gap-3 text-xs text-secondary">
                            <span><strong className="text-primary">{reminderStats.pendingCount}</strong> pending</span>
                            <span><strong className="text-success">{reminderStats.todaySent}</strong> sent today</span>
                            <span><strong className="text-primary">{reminderStats.totalSent}</strong> total</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRunManually}
                          disabled={runningManual}
                          className="flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-accent hover:bg-accent-light transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3 w-3 ${runningManual ? 'animate-spin' : ''}`} />
                          Run Now
                        </button>
                        <Button size="sm" onClick={handleSaveAutoReminder} loading={autoReminderSaving} disabled={autoReminderSaving}>
                          <Zap className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent processing logs */}
                {reminderStats?.recentLogs && reminderStats.recentLogs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Processing History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {reminderStats.recentLogs.map((log: any) => (
                          <div key={log.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-hover/50">
                            <div className="flex items-center gap-2">
                              <History className="h-3.5 w-3.5 text-secondary" />
                              <span className="text-xs text-primary">
                                {log.processed_at ? new Date(log.processed_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-secondary">
                              <span>{log.reminders_queued} queued</span>
                              <span className="text-success">{log.reminders_sent} sent</span>
                              {log.errors > 0 && <span className="text-error">{log.errors} errors</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notification channels */}
                <Card>
                  <CardHeader>
                    <CardTitle>Manual Reminder Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
                          <Mail className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">Email Notifications</p>
                          <p className="text-xs text-secondary">Send appointment reminders via email</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEmailNotifs(!emailNotifs)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${emailNotifs ? 'bg-accent' : 'bg-border'}`}
                      >
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${emailNotifs ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
                          <Smartphone className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">SMS Notifications</p>
                          <p className="text-xs text-secondary">Send appointment reminders via SMS</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSmsNotifs(!smsNotifs)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${smsNotifs ? 'bg-accent' : 'bg-border'}`}
                      >
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${smsNotifs ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
                          <Bell className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">In-App Notifications</p>
                          <p className="text-xs text-secondary">Show notifications in the header bell icon</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setInAppNotifs(!inAppNotifs)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${inAppNotifs ? 'bg-accent' : 'bg-border'}`}
                      >
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${inAppNotifs ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Default reminder timing */}
                <Card>
                  <CardHeader>
                    <CardTitle>Default Reminder Timing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <Input label="First Reminder" type="number" defaultValue="24" />
                      </div>
                      <p className="pb-2 text-sm text-secondary">hours before</p>
                      <div className="flex-1">
                        <Input label="Second Reminder" type="number" defaultValue="1" />
                      </div>
                      <p className="pb-2 text-sm text-secondary">hour before</p>
                    </div>
                    <p className="text-xs text-secondary">Patients will receive reminders at these intervals before their scheduled appointments.</p>
                  </CardContent>
                </Card>

                {/* Upcoming appointments with reminder status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Appointments</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {upcomingAppointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4">
                        <Calendar className="h-10 w-10 text-secondary/40 mb-3" />
                        <p className="text-sm text-secondary">No upcoming appointments</p>
                        <p className="text-xs text-secondary mt-1">Appointment reminders will appear here once scheduled</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {upcomingAppointments.map((apt: any) => (
                          <div key={apt.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-hover/50">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-light">
                                <Calendar className="h-4 w-4 text-accent" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-primary truncate">{apt.patient_name}</p>
                                <p className="text-xs text-secondary">
                                  {formatDate(apt.appointment_date)} at {apt.appointment_time?.slice(0,5)} &middot; {apt.doctor_name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${apt.reminder_sent ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                {apt.reminder_sent ? (
                                  <><CheckCircle2 className="h-3 w-3" /> Sent</>
                                ) : (
                                  <><Clock className="h-3 w-3" /> Pending</>
                                )}
                              </span>
                              <button
                                onClick={() => sendReminder(apt)}
                                className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-accent hover:bg-accent-light transition-colors"
                              >
                                <Bell className="h-3 w-3" /> Remind
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSave} loading={saving}>Save Preferences</Button>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Add Doctor Dialog */}
      <Dialog open={showAddDoctor} onClose={() => setShowAddDoctor(false)}
        title="Add Doctor" description="Add a new doctor to the clinic">
        <DialogContent>
          <div className="space-y-4">
            <Input label="Doctor Name" placeholder="e.g. Dr. Sharma"
              value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            <Input label="Specialization" placeholder="e.g. Endocrinologist"
              value={doctorSpecialization} onChange={(e) => setDoctorSpecialization(e.target.value)} />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddDoctor(false)}>Cancel</Button>
          <Button onClick={handleAddDoctor} disabled={doctorSaving} loading={doctorSaving}>
            Add Doctor
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
