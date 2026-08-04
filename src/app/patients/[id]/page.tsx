"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { calculateAge, calculateBMI, formatDate } from "@/lib/utils";
import {
  Calendar,
  FileText,
  HeartPulse,
  Mail,
  Phone,
  Pill,
  FlaskConical,
  CreditCard,
  Clock,
  MapPin,
  Shield,
  Activity,
  Upload,
  Download,
  Plus,
  Trash2,
  User,
  Circle,
  Syringe,
  Stethoscope,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPatientById, getPatientDocuments, getPatientAllergies, getPatientInvoices, getPatientTimeline, updatePatient } from "@/lib/queries";
import { useParams } from "next/navigation";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  blood_group: string;
  height_cm: number;
  weight_kg: number;
  diagnosis: string;
  status: string;
  insurance_provider: string;
  insurance_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  occupation: string;
}

interface Document {
  id: string;
  name: string;
  created_at: string;
  size: string;
  type: string;
  file_url: string;
}

interface Allergy {
  id: string;
  allergen: string;
  severity: string;
  reaction: string;
}

interface Invoice {
  id: string;
  created_at: string;
  amount: number;
  status: string;
}

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [billingRecords, setBillingRecords] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    Promise.all([
      getPatientById(patientId),
      getPatientDocuments(patientId),
      getPatientAllergies(patientId),
      getPatientInvoices(patientId),
    ]).then(([p, docs, allergies, bills]) => {
      setPatient(p as Patient);
      setDocuments(docs as Document[]);
      setAllergies(allergies as Allergy[]);
      setBillingRecords(bills as Invoice[]);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Fetch timeline events
    setTimelineLoading(true);
    getPatientTimeline(patientId).then((events) => {
      setTimeline(events as any[]);
      setTimelineLoading(false);
    }).catch(() => setTimelineLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-hover" />
          <div className="space-y-3 flex-1">
            <div className="h-6 w-64 bg-hover rounded" />
            <div className="h-4 w-96 bg-hover rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-hover rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <User className="h-12 w-12 text-secondary/40 mb-4" />
        <h3 className="text-sm font-medium text-primary">Patient not found</h3>
        <p className="text-xs text-secondary mt-1">This patient record does not exist</p>
        <Link href="/patients">
          <Button variant="outline" size="sm" className="mt-4">Back to Patients</Button>
        </Link>
      </div>
    );
  }

  const p = patient;
  const age = calculateAge(p.date_of_birth);
  const bmi = p.weight_kg && p.height_cm ? calculateBMI(p.weight_kg, p.height_cm) : "--";

  const handleDocumentUpload = () => {
    toast.success("Document uploaded successfully!");
    setShowUpload(false);
  };

  const handleDeleteDocument = (name: string) => {
    setDocuments(documents.filter(d => d.name !== name));
    toast.success("Document removed");
  };

  const openEdit = () => {
    setEditForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      date_of_birth: p.date_of_birth || "",
      gender: p.gender || "",
      phone: p.phone || "",
      email: p.email || "",
      address: p.address || "",
      city: p.city || "",
      state: p.state || "",
      blood_group: p.blood_group || "",
      height_cm: p.height_cm ? String(p.height_cm) : "",
      weight_kg: p.weight_kg ? String(p.weight_kg) : "",
      occupation: p.occupation || "",
      emergency_contact_name: p.emergency_contact_name || "",
      emergency_contact_phone: p.emergency_contact_phone || "",
      insurance_provider: p.insurance_provider || "",
      insurance_id: p.insurance_id || "",
    });
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      await updatePatient(patientId, {
        ...editForm,
        height_cm: editForm.height_cm ? parseFloat(editForm.height_cm) : null,
        weight_kg: editForm.weight_kg ? parseFloat(editForm.weight_kg) : null,
        gender: editForm.gender || null,
      });
      toast.success("Patient updated!");
      setShowEdit(false);
      // Refresh patient data
      getPatientById(patientId).then((data) => setPatient(data as Patient));
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally { setEditSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={`${p.first_name} ${p.last_name}`} size="xl" className="mt-1" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-primary">{p.first_name} {p.last_name}</h1>
              <Badge status={p.status as any} />
              <span className="text-xs text-secondary">{p.id}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-secondary">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{age} yrs / {p.gender === "male" ? "Male" : "Female"}</span>
              {p.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.city}{p.state ? `, ${p.state}` : ""}</span>}
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{p.phone}</span>
              {p.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{p.email}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/consultation/${p.id}`}>
            <Button size="sm"><HeartPulse className="h-4 w-4" />Start Consultation</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={openEdit}>Edit</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Blood Group", value: p.blood_group || "--", icon: Shield },
          { label: "BMI", value: `${bmi}`, sub: p.weight_kg && p.height_cm ? `${p.weight_kg} kg / ${p.height_cm} cm` : "", icon: Activity },
          { label: "Diagnosis", value: p.diagnosis || "--", icon: HeartPulse },
          { label: "Last Visit", value: "--", icon: Clock },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-secondary">{stat.label}</p>
                <stat.icon className="h-3.5 w-3.5 text-secondary" />
              </div>
              <p className="mt-1 text-sm font-semibold text-primary">{stat.value}</p>
              {stat.sub && <p className="text-[10px] text-secondary">{stat.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs
        tabs={[
          {
            id: "documents",
            label: "Documents",
            badge: documents.length || undefined,
            content: (
              <div className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc, i) => (
                    <div key={doc.id || i} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-hover/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
                          <FileText className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">{doc.name}</p>
                          <p className="text-xs text-secondary">{doc.type} &middot; {doc.size} &middot; {formatDate(doc.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover" title="Download">
                          <Download className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteDocument(doc.name)} className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-error/10 hover:text-error" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-8">
                    <div className="text-center">
                      <FileText className="mx-auto h-8 w-8 text-secondary" />
                      <p className="mt-2 text-sm text-secondary">No documents uploaded</p>
                    </div>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
                  <Upload className="h-3.5 w-3.5 mr-1" /> Upload Document
                </Button>
              </div>
            ),
          },
          {
            id: "allergies",
            label: "Allergies",
            badge: allergies.length || undefined,
            content: (
              <div className="space-y-3">
                {allergies.length > 0 ? (
                  allergies.map((a, i) => (
                    <div key={a.id || i} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-primary">{a.allergen}</p>
                        <p className="text-xs text-secondary">Reaction: {a.reaction}</p>
                      </div>
                      <Badge variant={a.severity === "severe" ? "error" : a.severity === "moderate" ? "warning" : "primary"}>{a.severity}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-8">
                    <div className="text-center">
                      <p className="text-sm text-secondary">No allergies recorded</p>
                    </div>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowAddAllergy(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Allergy
                </Button>
              </div>
            ),
          },
          {
            id: "billing",
            label: "Billing",
            content: (
              <div className="space-y-3">
                {billingRecords.length > 0 ? (
                  billingRecords.map((bill, i) => (
                    <div key={bill.id || i} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium text-primary">{bill.id}</p>
                        <p className="text-xs text-secondary">{formatDate(bill.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">₹{bill.amount || 0}</p>
                        <Badge status={bill.status as any} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-8">
                    <div className="text-center">
                      <CreditCard className="mx-auto h-8 w-8 text-secondary" />
                      <p className="mt-2 text-sm text-secondary">No billing records</p>
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            id: "insurance",
            label: "Insurance",
            content: (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-secondary">Provider</p>
                  <p className="text-sm font-medium text-primary">{p.insurance_provider || "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Policy ID</p>
                  <p className="text-sm font-medium text-primary">{p.insurance_id || "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Emergency Contact</p>
                  <p className="text-sm font-medium text-primary">{p.emergency_contact_name || "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Emergency Phone</p>
                  <p className="text-sm font-medium text-primary">{p.emergency_contact_phone || "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Occupation</p>
                  <p className="text-sm font-medium text-primary">{p.occupation || "--"}</p>
                </div>
              </div>
            ),
          },
          {
            id: "timeline",
            label: "Timeline",
            badge: timeline.length || undefined,
            content: (
              <Card>
                <CardContent className="p-0">
                  {timelineLoading ? (
                    <div className="p-6 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 animate-pulse">
                          <div className="h-8 w-8 rounded-full bg-hover" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-48 bg-hover rounded" />
                            <div className="h-3 w-32 bg-hover rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Clock className="h-10 w-10 text-secondary/40 mb-3" />
                      <p className="text-sm text-secondary">No timeline events yet</p>
                      <p className="text-xs text-secondary mt-1">Patient activity will appear as appointments, lab orders, prescriptions, and invoices are created</p>
                    </div>
                  ) : (
                    <div className="relative p-5">
                      {/* Vertical line */}
                      <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />

                      {timeline.map((event, i) => {
                        const iconMap: Record<string, any> = {
                          appointment: Stethoscope,
                          lab: FlaskConical,
                          prescription: Syringe,
                          invoice: Receipt,
                        };
                        const colorMap: Record<string, string> = {
                          appointment: "bg-accent",
                          lab: "bg-primary",
                          prescription: "bg-success",
                          invoice: "bg-warning",
                        };
                        const Icon = iconMap[event.type] || Circle;
                        const dotColor = colorMap[event.type] || "bg-secondary";

                        return (
                          <div key={`${event.type}-${event.id}-${i}`} className="relative flex items-start gap-4 pb-6 last:pb-0">
                            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${dotColor} text-white shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-primary">{event.title}</p>
                                {event.status && (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    event.status === "completed" || event.status === "active" || event.status === "paid"
                                      ? "bg-success/10 text-success"
                                      : event.status === "cancelled" || event.status === "overdue"
                                      ? "bg-error/10 text-error"
                                      : "bg-warning/10 text-warning"
                                  }`}>
                                    {event.status}
                                  </span>
                                )}
                              </div>
                              {event.subtitle && (
                                <p className="text-xs text-secondary mt-0.5">{event.subtitle}</p>
                              )}
                              <p className="text-[10px] text-secondary/60 mt-0.5">
                                {event.date ? (() => {
                                  try { return new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
                                  catch { return event.date; }
                                })() : ""}
                              </p>
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
        ]}
      />

      <Dialog open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document" description="Upload a document to this patient's records">
        <DialogContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-8 cursor-pointer hover:bg-hover/50 transition-colors">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-secondary" />
                <p className="mt-2 text-sm text-primary font-medium">Click to upload</p>
                <p className="text-xs text-secondary mt-1">PDF, JPG, PNG up to 10MB</p>
              </div>
            </div>
            <select className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm">
              <option value="lab_report">Lab Report</option>
              <option value="prescription">Prescription</option>
              <option value="consent">Consent Form</option>
              <option value="other">Other Document</option>
            </select>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
          <Button onClick={handleDocumentUpload}>Upload</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={showAddAllergy} onClose={() => setShowAddAllergy(false)} title="Add Allergy" description="Record a new allergy for this patient">
        <DialogContent>
          <div className="space-y-4">
            <Input label="Allergen" placeholder="e.g. Penicillin" />
            <select className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm">
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
            <Input label="Reaction" placeholder="e.g. Skin rash, anaphylaxis" />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddAllergy(false)}>Cancel</Button>
          <Button onClick={() => { toast.success("Allergy added"); setShowAddAllergy(false); }}>Add Allergy</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)}
        title="Edit Patient" description="Update patient information">
        <DialogContent>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input label="First Name" value={editForm.first_name || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} />
            <Input label="Last Name" value={editForm.last_name || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} />
            <Input label="Date of Birth" type="date" value={editForm.date_of_birth || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Gender</label>
              <select value={editForm.gender || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input label="Phone" value={editForm.phone || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" value={editForm.email || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Address" value={editForm.address || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={editForm.city || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
              <Input label="State" value={editForm.state || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))} />
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-secondary mb-3">Medical</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">Blood Group</label>
                  <select value={editForm.blood_group || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, blood_group: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">Select</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <Input label="Height (cm)" type="number" value={editForm.height_cm || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, height_cm: e.target.value }))} />
              </div>
              <Input label="Weight (kg)" type="number" className="mt-3" value={editForm.weight_kg || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, weight_kg: e.target.value }))} />
              <Input label="Occupation" className="mt-3" value={editForm.occupation || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, occupation: e.target.value }))} />
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-secondary mb-3">Emergency Contact</p>
              <Input label="Contact Name" value={editForm.emergency_contact_name || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, emergency_contact_name: e.target.value }))} />
              <Input label="Contact Phone" className="mt-3" value={editForm.emergency_contact_phone || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))} />
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-secondary mb-3">Insurance</p>
              <Input label="Insurance Provider" value={editForm.insurance_provider || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, insurance_provider: e.target.value }))} />
              <Input label="Insurance ID" className="mt-3" value={editForm.insurance_id || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, insurance_id: e.target.value }))} />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button onClick={handleEditSave} disabled={editSaving} loading={editSaving}>Save Changes</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
