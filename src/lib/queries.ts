"use server";

import { createAdminClient } from "@/lib/supabase/server";

// ─── Helper ─────────────────────────────────────────────────
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error("DB query error:", e);
    return fallback;
  }
}

function getDb() {
  return createAdminClient();
}

async function logActivity(action: string, userId?: string) {
  try {
    // activity_logs has no user_name column and requires resource_type.
    await getDb().from("activity_logs").insert([{
      action,
      user_id: userId || null,
      resource_type: "activity",
      created_at: new Date().toISOString(),
    }]);
  } catch {}
}

// ─── Helpers ───────────────────────────────────────────────
// Write helper: PROPAGATES errors so the UI can surface a real failure.
// (safeQuery swallows errors and returns a fallback, which made writes like
// createAppointment appear to succeed when the row was never inserted.)
async function writeQuery<T>(fn: () => Promise<T>, _fallback?: T | null): Promise<T> {
  return await fn();
}

// Local-time date key ("YYYY-MM-DD"). Using toISOString() here is a UTC
// serialization and can shift "today" by one day in timezones ahead of UTC
// (e.g. India), making dashboards report the wrong date.
function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Normalize the appointment type the UI sends (e.g. "Consultation",
// "Follow-up", "Review", "New Patient") to the constrained values used by the
// appointments.type CHECK constraint / analytics queries.
function normalizeAppointmentType(t: string | undefined | null): string {
  const v = (t || "").trim().toLowerCase();
  const map: Record<string, string> = {
    consultation: "consultation",
    "follow-up": "follow_up",
    followup: "follow_up",
    "follow up": "follow_up",
    follow: "follow_up",
    review: "review",
    "new patient": "consultation",
    emergency: "emergency",
    procedure: "procedure",
  };
  return map[v] || "consultation";
}

// Derive a 30 minute end_time from a "HH:MM" appointment_time.
function deriveEndTime(appointmentTime?: string | null): string {
  const start = (appointmentTime || "09:00").slice(0, 5);
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + 30;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

// ─── Patients ───────────────────────────────────────────────
export async function getProfileByUserId(userId: string) {
  return safeQuery(async () => {
    const { data, error } = await getDb().from("profiles").select("full_name, role").eq("id", userId).single();
    if (error) return null;
    return data;
  }, null);
}

export async function getPatients() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);
}

export async function getPatientById(id: string) {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }, null);
}

export async function createPatient(formData: Record<string, any>) {
  return writeQuery(async () => {
    const { data, error } = await getDb()
      .from("patients")
      .insert([formData])
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(`Created patient: ${formData.first_name || ""} ${formData.last_name || ""}`);
    return data;
  }, null);
}

export async function updatePatient(id: string, formData: Record<string, any>) {
  return writeQuery(async () => {
    const { data, error } = await getDb()
      .from("patients")
      .update(formData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(`Updated patient: ${formData.first_name || id}`);
    return data;
  }, null);
}

// ─── Appointments ───────────────────────────────────────────
export async function getAppointments(date?: string) {
  return safeQuery(async () => {
    let query = getDb()
      .from("appointments")
      .select("*, patients(first_name, last_name)")
      .order("appointment_date", { ascending: true });
    if (date) query = query.eq("appointment_date", date);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, []);
}

export async function getAppointmentsByMonth(year: number, month: number) {
  return safeQuery(async () => {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    // Build the last day of the month in LOCAL time — toISOString() here would
    // shift the last day back by one for timezones ahead of UTC (e.g. India).
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const { data, error } = await getDb()
      .from("appointments")
      .select("appointment_date, status")
      .gte("appointment_date", startDate)
      .lte("appointment_date", endDate);
    if (error) throw error;
    return data || [];
  }, []);
}

export async function createAppointment(formData: {
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  type: string;
}) {
  return writeQuery(async () => {
    const appointment_time = formData.appointment_time || "09:00";

    // Try to resolve patient_id from name
    const nameParts = formData.patient_name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const { data: patient } = await getDb()
      .from("patients")
      .select("id")
      .or(`first_name.ilike.${firstName},last_name.ilike.${lastName}`)
      .limit(1)
      .maybeSingle();

    const { data, error } = await getDb().from("appointments").insert([
      {
        patient_name: formData.patient_name,
        patient_id: patient?.id || null,
        appointment_date: formData.appointment_date,
        appointment_time,
        start_time: appointment_time,
        end_time: deriveEndTime(appointment_time),
        doctor_name: formData.doctor_name,
        type: normalizeAppointmentType(formData.type),
        title: `Appointment - ${formData.patient_name}`,
        status: "scheduled",
      },
    ]).select().single();
    if (error) throw new Error(error.message);
    await logActivity(`Scheduled appointment for ${formData.patient_name} with ${formData.doctor_name}`);
    return data;
  }, null);
}

export async function getAppointmentStats() {
  return safeQuery(async () => {
    const db = getDb();
    const today = localDateKey();
    const [total, todayCount, cancelled, rescheduled, completed] = await Promise.all([
      db.from("appointments").select("id", { count: "exact", head: true }),
      db.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today),
      db.from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
      db.from("appointments").select("id", { count: "exact", head: true }).eq("status", "rescheduled"),
      db.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);
    return {
      total: total.count ?? 0,
      today: todayCount.count ?? 0,
      cancelled: cancelled.count ?? 0,
      rescheduled: rescheduled.count ?? 0,
      completed: completed.count ?? 0,
    };
  }, { total: 0, today: 0, cancelled: 0, rescheduled: 0, completed: 0 });
}

export async function cancelAppointment(id: string) {
  return writeQuery(async () => {
    const { data: apt } = await getDb().from("appointments").select("patient_name").eq("id", id).single();
    const { error } = await getDb()
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity(`Cancelled appointment for ${apt?.patient_name || id}`);
    return true;
  }, false);
}

export async function rescheduleAppointment(id: string, appointment_date: string, appointment_time: string) {
  return writeQuery(async () => {
    const { data: apt } = await getDb().from("appointments").select("patient_name").eq("id", id).single();
    const { error } = await getDb()
      .from("appointments")
      .update({
        appointment_date,
        appointment_time,
        start_time: appointment_time || "09:00",
        end_time: deriveEndTime(appointment_time),
        status: "rescheduled",
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity(`Rescheduled appointment for ${apt?.patient_name || id}`);
    return true;
  }, false);
}

// ─── Doctors ────────────────────────────────────────────────
export async function getDoctors() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("doctors")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);
}

export async function addDoctor(name: string, specialization: string) {
  return writeQuery(async () => {
    const { data, error } = await getDb()
      .from("doctors")
      .insert([{ name, specialization, status: "active" }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(`Added doctor: ${name}`);
    return data;
  }, null);
}

export async function removeDoctor(id: string) {
  return writeQuery(async () => {
    const { error } = await getDb()
      .from("doctors")
      .update({ status: "inactive" })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }, false);
}

// ─── Lab Tests (Catalog) ───────────────────────────────────
export async function getLabTests() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("lab_tests")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);
}

export async function addLabTest(formData: {
  name: string;
  category?: string;
  sample_type?: string;
  price?: number;
  instructions?: string;
}) {
  return writeQuery(async () => {
    const { data, error } = await getDb()
      .from("lab_tests")
      .insert([{ ...formData, is_active: true }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(`Added lab test: ${formData.name}`);
    return data;
  }, null);
}

export async function removeLabTest(id: string) {
  return writeQuery(async () => {
    const { error } = await getDb()
      .from("lab_tests")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }, false);
}

export async function updateLabOrderResult(id: string, resultData: {
  result: string;
  ref_range?: string;
  unit?: string;
  is_abnormal?: boolean;
}) {
  return writeQuery(async () => {
    const { data, error } = await getDb()
      .from("lab_orders")
      .update({
        result: resultData.result,
        ref_range: resultData.ref_range || null,
        unit: resultData.unit || null,
        is_abnormal: resultData.is_abnormal || false,
        status: "completed",
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(`Recorded lab result`);
    return data;
  }, null);
}

// ─── Lab Orders ─────────────────────────────────────────────
export async function getLabOrders() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("lab_orders")
      .select("*, patients(first_name, last_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);
}

export async function createLabOrder(formData: {
  patient_name: string;
  test_name: string;
  priority: string;
  doctor_name?: string;
}) {
  return writeQuery(async () => {
    // Look up patient_id from name
    const nameParts = formData.patient_name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const { data: patient } = await getDb()
      .from("patients")
      .select("id")
      .or(`first_name.ilike.${firstName},last_name.ilike.${lastName}`)
      .limit(1)
      .maybeSingle();

    const { data, error } = await getDb().from("lab_orders").insert([
      {
        patient_name: formData.patient_name,
        patient_id: patient?.id || null,
        test_name: formData.test_name,
        priority: formData.priority,
        doctor_name: formData.doctor_name || null,
        status: "ordered",
      },
    ]).select().single();
    if (error) throw new Error(error.message);
    await logActivity(`Created lab order: ${formData.test_name} for ${formData.patient_name}`);
    return data;
  }, null);
}

// ─── Prescriptions ──────────────────────────────────────────
export async function getPrescriptions() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("prescriptions")
      .select("*, patients(first_name, last_name, date_of_birth, gender), prescription_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);
}

export async function createPrescription(formData: {
  patient_name: string;
  diagnosis?: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string; instructions: string }[];
}) {
  return writeQuery(async () => {
    const db = getDb();

    // Look up patient_id from name
    const nameParts = formData.patient_name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const { data: patient } = await db
      .from("patients")
      .select("id")
      .or(`first_name.ilike.${firstName},last_name.ilike.${lastName}`)
      .limit(1)
      .maybeSingle();

    const { data: prescription, error: headerError } = await db.from("prescriptions").insert([
      {
        patient_name: formData.patient_name,
        patient_id: patient?.id || null,
        diagnosis: formData.diagnosis || "",
        is_active: true,
      },
    ]).select().single();
    if (headerError) throw new Error(headerError.message);
    await logActivity(`Created prescription for ${formData.patient_name} with ${formData.medicines.length} medicines`);

    // Insert prescription items (medicines)
    if (prescription && formData.medicines.length > 0) {
      const items = formData.medicines
        .filter((m) => m.name.trim())
        .map((m) => ({
          prescription_id: prescription.id,
          medicine_name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
        }));
      if (items.length > 0) {
        const { error: itemsError } = await db.from("prescription_items").insert(items);
        if (itemsError) throw new Error(itemsError.message);
      }
    }

    return prescription;
  }, null);
}

// ─── Invoices ───────────────────────────────────────────────
export async function getInvoices() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("invoices")
      .select("*, patients(first_name, last_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);
}

export async function createInvoice(formData: {
  patient_name: string;
  amount: number;
  description?: string;
}) {
  return writeQuery(async () => {
    const invNum = `INV-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0")}`;
    const { data, error } = await getDb().from("invoices").insert([
      {
        invoice_number: invNum,
        patient_name: formData.patient_name,
        total: formData.amount,
        notes: formData.description || "",
        status: "pending",
        status_text: "pending",
        date: new Date().toISOString().split("T")[0],
      },
    ]).select().single();
    if (error) throw new Error(error.message);
    await logActivity(`Created invoice: ₹${formData.amount} for ${formData.patient_name}`);
    return data;
  }, null);
}

// ─── Dashboard ──────────────────────────────────────────────
export async function getDashboardMetrics() {
  return safeQuery(async () => {
    const db = getDb();
    const today = localDateKey();

    const [apptsToday, totalPatients, paidInvoices, followUpsDue] =
      await Promise.all([
        db.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", today),
        db.from("patients").select("id", { count: "exact", head: true }),
        db.from("invoices").select("total, status_text, date"),
        db.from("appointments").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
      ]);

    const revenueTotal = (paidInvoices.data || [])
      .filter((inv: any) => (inv.date || inv.created_at?.slice?.(0, 10)) === today && inv.status_text === "paid")
      .reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0);

    return {
      appointmentsToday: apptsToday.count ?? 0,
      totalPatients: totalPatients.count ?? 0,
      revenueToday: revenueTotal,
      followUpsDue: followUpsDue.count ?? 0,
    };
  }, { appointmentsToday: 0, totalPatients: 0, revenueToday: 0, followUpsDue: 0 });
}

// ─── Check In / Queue ──────────────────────────────────────
export async function checkInPatient(patientName: string, doctorName: string) {
  return writeQuery(async () => {
    const db = getDb();

    // Look up patient ID from name
    const nameParts = patientName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const { data: patient } = await db
      .from("patients")
      .select("id")
      .or(`first_name.ilike.${firstName},last_name.ilike.${lastName}`)
      .limit(1)
      .maybeSingle();

    // Next token = max existing token_number + 1
    const { data: maxRow } = await db
      .from("queue")
      .select("token_number")
      .order("token_number", { ascending: false })
      .limit(1);
    const tokenNumber = (maxRow?.[0]?.token_number || 0) + 1;

    const { data, error } = await db.from("queue").insert([
      {
        patient_name: patientName,
        patient_id: patient?.id || null,
        doctor_name: doctorName,
        token: String(tokenNumber),
        token_number: tokenNumber,
        status: "checked_in",
        priority: "normal",
      },
    ]).select().single();
    if (error) throw new Error(error.message);

    // Keep the matching appointment on today's schedule in sync
    await db
      .from("appointments")
      .update({ status: "checked_in" })
      .eq("patient_name", patientName)
      .eq("appointment_date", localDateKey())
      .eq("status", "scheduled");

    await logActivity(`Checked in patient: ${patientName} (Token #${tokenNumber})`);
    return data;
  }, null);
}

// ─── Queue ──────────────────────────────────────────────────
export async function getQueue() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("queue")
      .select("*, patients(first_name, last_name)")
      .order("token_number", { ascending: true })
      .in("status", ["waiting", "in_consultation", "checked_in"]);
    if (error) throw error;
    return data || [];
  }, []);
}

// ─── Activity ───────────────────────────────────────────────
export async function getRecentActivity() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data || [];
  }, []);
}

// ─── Appointment Reminders ──────────────────────────────────
export async function sendAppointmentReminder(appointmentId: string) {
  return safeQuery(async () => {
    const { data: apt } = await getDb()
      .from("appointments")
      .select("patient_name, appointment_date, appointment_time, doctor_name")
      .eq("id", appointmentId)
      .single();
    if (!apt) throw new Error("Appointment not found");
    await logActivity(`Reminder sent to ${apt.patient_name} for ${apt.appointment_date} at ${apt.appointment_time?.slice(0,5)} with ${apt.doctor_name}`);
    // In production, this would also call an email/SMS API
    return { success: true, patientName: apt.patient_name, date: apt.appointment_date, time: apt.appointment_time };
  }, null);
}

export async function getReminderHistory() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("activity_logs")
      .select("*")
      .ilike("action", "Reminder sent%")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }, []);
}

// ─── SOAP Notes / Vitals ────────────────────────────────────
export async function saveSOAPNotes(formData: {
  patient_id: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  vitals?: Record<string, any>;
}) {
  return writeQuery(async () => {
    const db = getDb();
    const today = localDateKey();

    const { data, error } = await db
      .from("soap_notes")
      .insert([{ ...formData, diagnosis: formData.assessment }])
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Update the patient's diagnosis and last_visit
    if (formData.assessment) {
      await db.from("patients").update({
        diagnosis: formData.assessment,
        last_visit: today,
      }).eq("id", formData.patient_id);
    } else {
      await db.from("patients").update({ last_visit: today }).eq("id", formData.patient_id);
    }

    return data;
  }, null);
}

// ─── Patient Documents ─────────────────────────────────────
export async function getPatientDocuments(patientId: string) {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("patient_documents")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);
}

// ─── Patient Allergies ─────────────────────────────────────
export async function getPatientAllergies(patientId: string) {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("patient_allergies")
      .select("*")
      .eq("patient_id", patientId);
    if (error) throw error;
    return data || [];
  }, []);
}

// ─── Notifications ────────────────────────────────────────
export async function getNotifications() {
  return safeQuery(async () => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    const [upcomingAppts, pendingLabs, allMeds] = await Promise.all([
      db.from("appointments").select("id, patient_name, appointment_time, doctor_name").eq("appointment_date", today).eq("status", "scheduled"),
      db.from("lab_orders").select("id, patient_name, test_name, created_at").in("status", ["ordered", "sample_collected", "in_progress"]),
      db.from("medicines").select("id, name, stock_quantity, reorder_level").eq("is_active", true),
    ]);

    const lowStock = (allMeds.data || []).filter((m: any) => m.stock_quantity <= m.reorder_level);

    return {
      appointmentsToday: (upcomingAppts.data || []).length,
      pendingLabs: (pendingLabs.data || []).length,
      lowStockItems: lowStock.length,
      appointments: (upcomingAppts.data || []).slice(0, 5),
      labOrders: (pendingLabs.data || []).slice(0, 5),
      lowStockMeds: lowStock.slice(0, 5),
    };
  }, { appointmentsToday: 0, pendingLabs: 0, lowStockItems: 0, appointments: [], labOrders: [], lowStockMeds: [] });
}

// ─── Medicines / Pharmacy ───────────────────────────────────
export async function getMedicines() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("medicines")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);
}

export async function addMedicine(formData: {
  name: string;
  generic_name?: string;
  category?: string;
  manufacturer?: string;
  unit?: string;
  stock_quantity?: number;
  reorder_level?: number;
  unit_price?: number;
  selling_price?: number;
  requires_prescription?: boolean;
}) {
  return writeQuery(async () => {
    const { data, error } = await getDb()
      .from("medicines")
      .insert([{ ...formData, is_active: true }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(`Added medicine: ${formData.name}`);
    return data;
  }, null);
}

export async function updateMedicine(id: string, formData: Record<string, any>) {
  return writeQuery(async () => {
    const { data, error } = await getDb()
      .from("medicines")
      .update(formData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(`Updated medicine: ${formData.name || id}`);
    return data;
  }, null);
}

export async function deleteMedicine(id: string) {
  return writeQuery(async () => {
    const { error } = await getDb()
      .from("medicines")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity(`Removed medicine`);
    return true;
  }, false);
}

// ─── Stock Movements ──────────────────────────────────────
export async function adjustStock(medicineId: string, change: number, reason: string) {
  return writeQuery(async () => {
    const db = getDb();
    // Get current stock
    const { data: med } = await db.from("medicines").select("id, name, stock_quantity").eq("id", medicineId).single();
    if (!med) throw new Error("Medicine not found");
    const newQty = Math.max(0, (med.stock_quantity || 0) + change);
    await db.from("medicines").update({ stock_quantity: newQty }).eq("id", medicineId);
    await logActivity(`Stock adjusted for ${med.name}: ${change > 0 ? "+" : ""}${change} (${reason})`);
    return { medicine: med.name, old: med.stock_quantity, new: newQty, change };
  }, null);
}

export async function getStockMovements(medicineId?: string) {
  return safeQuery(async () => {
    let query = getDb().from("activity_logs").select("*").ilike("action", "Stock adjusted%").order("created_at", { ascending: false }).limit(20);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).filter((row: any) =>
      !medicineId || row.action.includes(medicineId)
    );
  }, []);
}

// ─── Patient Timeline ──────────────────────────────────────
export async function getPatientTimeline(patientId: string) {
  return safeQuery(async () => {
    const db = getDb();
    // Get patient name for denormalized queries as fallback
    const { data: patient } = await db.from("patients").select("first_name, last_name").eq("id", patientId).single();
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "";

    // Query by patient_id AND patient_name to catch both normalized and denormalized records
    const [appointments, labOrders, prescriptions, invoices] = await Promise.all([
      db.from("appointments").select("*")
        .or(`patient_id.eq.${patientId}${patientName ? `,patient_name.ilike.${patientName}` : ""}`)
        .order("appointment_date", { ascending: false }),
      db.from("lab_orders").select("*")
        .or(`patient_id.eq.${patientId}${patientName ? `,patient_name.ilike.${patientName}` : ""}`)
        .order("created_at", { ascending: false }),
      db.from("prescriptions").select("*")
        .or(`patient_id.eq.${patientId}${patientName ? `,patient_name.ilike.${patientName}` : ""}`)
        .order("created_at", { ascending: false }),
      db.from("invoices").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
    ]);

    type TimelineEvent = {
      id: string;
      type: "appointment" | "lab" | "prescription" | "invoice";
      date: string;
      title: string;
      subtitle: string;
      status: string;
      data: any;
    };

    const events: TimelineEvent[] = [];

    (appointments.data || []).forEach((a: any) => events.push({
      id: a.id, type: "appointment", date: a.appointment_date,
      title: `Appointment - ${a.doctor_name}`,
      subtitle: `${a.appointment_time?.slice(0,5)} ${a.type ? `\u00b7 ${a.type}` : ""}`,
      status: a.status, data: a,
    }));

    (labOrders.data || []).forEach((l: any) => events.push({
      id: l.id, type: "lab", date: l.created_at?.split("T")[0],
      title: `Lab: ${l.test_name}`,
      subtitle: l.result ? `Result: ${l.result}` : "Pending",
      status: l.status, data: l,
    }));

    (prescriptions.data || []).forEach((p: any) => events.push({
      id: p.id, type: "prescription", date: p.created_at?.split("T")[0],
      title: `Prescription${p.diagnosis ? `: ${p.diagnosis}` : ""}`,
      subtitle: "",
      status: p.status, data: p,
    }));

    (invoices.data || []).forEach((i: any) => events.push({
      id: i.id, type: "invoice", date: i.date || i.created_at?.split("T")[0],
      title: `Invoice ${i.invoice_number || ""}`,
      subtitle: `\u20b9${i.total || 0}`,
      status: i.status_text || i.status, data: i,
    }));

    events.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

    return events;
  }, []);
}

// ─── Patient Portal ───────────────────────────────────────
export async function getPatientByEmail(email: string) {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("patients")
      .select("*")
      .eq("email", email)
      .single();
    if (error) throw error;
    return data;
  }, null);
}

export async function getPatientPortalData(patientId: string) {
  return safeQuery(async () => {
    const db = getDb();
    const { data: patient } = await db.from("patients").select("*").eq("id", patientId).single();
    if (!patient) return { patient: null, appointments: [], labOrders: [], prescriptions: [] };

    const patientName = `${patient.first_name} ${patient.last_name}`;
    const [appointments, labOrders, prescriptions] = await Promise.all([
      db.from("appointments").select("*")
        .or(`patient_id.eq.${patientId},patient_name.ilike.${patientName}`)
        .order("appointment_date", { ascending: false }).limit(10),
      db.from("lab_orders").select("*")
        .or(`patient_id.eq.${patientId},patient_name.ilike.${patientName}`)
        .order("created_at", { ascending: false }).limit(10),
      db.from("prescriptions").select("*")
        .or(`patient_id.eq.${patientId},patient_name.ilike.${patientName}`)
        .order("created_at", { ascending: false }).limit(10),
    ]);

    return {
      patient,
      appointments: appointments.data || [],
      labOrders: labOrders.data || [],
      prescriptions: prescriptions.data || [],
    };
  }, { patient: null, appointments: [], labOrders: [], prescriptions: [] });
}

// ─── Invoice Management ────────────────────────────────────
export async function markInvoicePaid(id: string) {
  return writeQuery(async () => {
    const { data: inv } = await getDb().from("invoices").select("patient_name, total").eq("id", id).single();
    const { error } = await getDb()
      .from("invoices")
      .update({ status_text: "paid", status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity(`Marked invoice as paid: ₹${inv?.total || 0} for ${inv?.patient_name || id}`);
    return true;
  }, false);
}

export async function getRevenueReport() {
  return safeQuery(async () => {
    const db = getDb();
    const now = new Date();
    const promises = [];
    // Get last 6 months data
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().split("T")[0];
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0).toISOString().split("T")[0];
      promises.push(
        db.from("invoices").select("total, status_text, created_at")
          .gte("created_at", start).lte("created_at", end + "T23:59:59")
      );
    }
    const results = await Promise.all(promises);
    return results.map((r, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const monthName = d.toLocaleDateString("en-US", { month: "short" });
      const data = r.data || [];
      return {
        month: monthName,
        year: d.getFullYear(),
        revenue: data.reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0),
        count: data.length,
        paid: data.filter((inv: any) => inv.status_text === "paid").length,
      };
    });
  }, []);
}

export async function getAllActivityLogs(limit = 50) {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }, []);
}

export async function getStockHistory() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("activity_logs")
      .select("*")
      .ilike("action", "Stock adjusted%")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  }, []);
}

export async function getMonthlyStats() {
  return safeQuery(async () => {
    const db = getDb();
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];
    const [appointments, patients, labOrders, prescriptions] = await Promise.all([
      db.from("appointments").select("appointment_date, status").gte("appointment_date", startDate).order("appointment_date", { ascending: true }),
      db.from("patients").select("created_at").order("created_at", { ascending: false }),
      db.from("lab_orders").select("created_at, status"),
      db.from("prescriptions").select("created_at"),
    ]);
    return {
      appointments: appointments.data || [],
      totalPatients: patients.data?.length || 0,
      labOrders: labOrders.data || [],
      prescriptions: prescriptions.data?.length || 0,
    };
  }, { appointments: [], totalPatients: 0, labOrders: [], prescriptions: 0 });
}

// ─── Queue Display Board ──────────────────────────────────
export async function getQueueBoard() {
  return safeQuery(async () => {
    const db = getDb();
    const [queueData, doctorList] = await Promise.all([
      db.from("queue")
        .select("id, token, token_number, patient_name, doctor_name, status, created_at")
        .in("status", ["waiting", "called", "in_consultation", "checked_in"])
        .order("token_number", { ascending: true }),
      db.from("doctors")
        .select("name, specialization, status")
        .eq("status", "active"),
    ]);

    const queue = queueData.data || [];
    const doctors = doctorList.data || [];

    const inConsultation = queue.filter((q: any) => q.status === "in_consultation");
    const waiting = queue.filter((q: any) => q.status === "waiting" || q.status === "checked_in");
    const called = queue.filter((q: any) => q.status === "called");

    return {
      inConsultation,
      waiting,
      called,
      doctors,
      totalInQueue: queue.length,
      lastUpdated: new Date().toISOString(),
    };
  }, { inConsultation: [], waiting: [], called: [], doctors: [], totalInQueue: 0, lastUpdated: new Date().toISOString() });
}

// ─── Doctor Availability / Schedule ────────────────────────
export async function getDoctorAvailability() {
  return safeQuery(async () => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = new Date().getDay();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = dayNames[dayOfWeek];

    const [doctors, todayAppts] = await Promise.all([
      db.from("doctors").select("*").order("name"),
      db.from("appointments").select("doctor_name, appointment_time, status")
        .eq("appointment_date", today)
        .in("status", ["scheduled", "checked_in", "in_progress"]),
    ]);

    // Check for doctor_availability table or return schedule based on appointments
    const { data: availability } = await db.from("doctor_availability").select("*");

    return {
      doctors: doctors.data || [],
      todayAppointments: todayAppts.data || [],
      availability: availability || [],
      todayName,
    };
  }, { doctors: [], todayAppointments: [], availability: [], todayName: "" });
}

export async function saveDoctorAvailability(doctorId: string, dayOfWeek: string, startTime: string, endTime: string, isAvailable: boolean) {
  return writeQuery(async () => {
    const db = getDb();
    // Upsert: delete existing and insert
    await db.from("doctor_availability")
      .delete()
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek);

    if (!isAvailable) return { success: true };

    const { error } = await db.from("doctor_availability").insert([{
      doctor_id: doctorId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_available: true,
    }]);
    if (error) throw new Error(error.message);
    await logActivity(`Updated availability for doctor ${doctorId} on ${dayOfWeek}`);
    return { success: true };
  }, { success: false });
}

// ─── Portal Appointment Booking ───────────────────────────
export async function bookAppointmentFromPortal(patientName: string, doctorName: string, appointmentDate: string, appointmentTime: string, type: string) {
  return writeQuery(async () => {
    const db = getDb();
    const time = appointmentTime || "09:00";
    const { data, error } = await db.from("appointments").insert([
      {
        patient_name: patientName,
        appointment_date: appointmentDate,
        appointment_time: time,
        start_time: time,
        end_time: deriveEndTime(time),
        doctor_name: doctorName,
        type: normalizeAppointmentType(type),
        title: `Appointment - ${patientName}`,
        status: "scheduled",
      },
    ]).select().single();
    if (error) throw new Error(error.message);
    await logActivity(`Portal booking: ${patientName} booked with ${doctorName} on ${appointmentDate}`);
    return data;
  }, null);
}

// ─── Patient Documents (Portal) ───────────────────────────
export async function getPortalDocuments(patientId: string) {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("patient_documents")
      .select("*")
      .eq("patient_id", patientId)
      .eq("shared_with_patient", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);
}

export async function uploadPatientDocument(formData: {
  patient_id: string;
  name: string;
  file_name: string;
  file_size: number;
  file_type: string;
  category: string;
  storage_path: string;
  description?: string;
}) {
  return writeQuery(async () => {
    const { data, error } = await getDb()
      .from("patient_documents")
      .insert([{ ...formData, shared_with_patient: true }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity(`Uploaded document: ${formData.name} for patient`);
    return data;
  }, null);
}

export async function deletePatientDocument(id: string) {
  return writeQuery(async () => {
    const { error } = await getDb()
      .from("patient_documents")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }, false);
}

export async function updateReminderServerAction(formData: {
  appointmentId: string;
  channel: "email" | "sms" | "both";
  message?: string;
}) {
  return writeQuery(async () => {
    const db = getDb();
    const { data: apt } = await db
      .from("appointments")
      .select("patient_name, appointment_date, appointment_time, doctor_name")
      .eq("id", formData.appointmentId)
      .single();
    if (!apt) throw new Error("Appointment not found");

    // Try to find patient phone/email by querying patients
    const patientName = apt.patient_name || "";
    const nameParts = patientName.split(" ");
    let patientPhone: string | undefined;
    let patientEmail: string | undefined;

    try {
      if (nameParts.length >= 2) {
        const { data: patient } = await db
          .from("patients")
          .select("phone, email")
          .eq("first_name", nameParts[0])
          .eq("last_name", nameParts.slice(1).join(" "))
          .single();
        if (patient) {
          patientPhone = patient.phone || undefined;
          patientEmail = patient.email || undefined;
        }
      }
    } catch {}

    await logActivity(
      `Reminder sent to ${apt.patient_name} for ${apt.appointment_date} at ${apt.appointment_time?.slice(0,5)} with ${apt.doctor_name} via ${formData.channel}`
    );

    return {
      success: true,
      patientName: apt.patient_name,
      date: apt.appointment_date,
      time: apt.appointment_time,
    };
  }, null);
}

// ─── Patient Notification Preferences ─────────────────────
export async function getPatientPrefs(email: string) {
  return safeQuery(async () => {
    const db = getDb();
    // Get patient first, then check for preferences
    const { data: patient } = await db
      .from("patients")
      .select("id, phone, email, first_name, last_name")
      .eq("email", email)
      .single();
    if (!patient) return null;

    // Try to get preferences from patient_notification_prefs table
    let prefsResult = null as any;
    try {
      const result = await db
        .from("patient_notification_prefs")
        .select("*")
        .eq("patient_id", patient.id)
        .single();
      prefsResult = result.data;
    } catch {
      prefsResult = null;
    }

    return {
      patient,
      preferences: prefsResult || {
        patient_id: patient.id,
        email_notifications: true,
        sms_notifications: true,
        reminder_hours_before: 24,
        second_reminder_hours: 1,
      },
    };
  }, null);
}

export async function savePatientNotificationPrefs(formData: {
  patient_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  reminder_hours_before: number;
  second_reminder_hours: number;
}) {
  return writeQuery(async () => {
    const db = getDb();
    // Upsert: check existing, then insert or update
    let existingPref = null as any;
    try {
      const result = await db
        .from("patient_notification_prefs")
        .select("id")
        .eq("patient_id", formData.patient_id)
        .single();
      existingPref = result.data;
    } catch {
      existingPref = null;
    }

    if (existingPref) {
      const { error } = await db
        .from("patient_notification_prefs")
        .update(formData)
        .eq("id", existingPref.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("patient_notification_prefs")
        .insert([formData]);
      if (error) throw new Error(error.message);
    }

    await logActivity(`Updated notification preferences for patient ${formData.patient_id}`);
    return { success: true };
  }, { success: false });
}

// ─── Patient Invoices ──────────────────────────────────────
export async function getPatientInvoices(patientId: string) {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("invoices")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);
}

// ─── Auto Reminder Configuration ─────────────────────────
export async function getAutoReminderConfig() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("auto_reminder_config")
      .select("*")
      .limit(1)
      .single();
    if (error) {
      // Return defaults if table doesn't exist or no config
      return {
        enabled: false,
        default_channel: "both",
        first_reminder_hours: 24,
        second_reminder_hours: 1,
        window_start_hour: 9,
        window_end_hour: 20,
      };
    }
    return data;
  }, {
    enabled: false,
    default_channel: "both",
    first_reminder_hours: 24,
    second_reminder_hours: 1,
    window_start_hour: 9,
    window_end_hour: 20,
  });
}

export async function saveAutoReminderConfig(formData: {
  enabled: boolean;
  default_channel: string;
  first_reminder_hours: number;
  second_reminder_hours: number;
  window_start_hour: number;
  window_end_hour: number;
}) {
  return writeQuery(async () => {
    const db = getDb();
    // Upsert: check if config exists
    const { data: existing } = await db.from("auto_reminder_config").select("id").limit(1).single();

    if (existing) {
      await db.from("auto_reminder_config").update(formData).eq("id", existing.id);
    } else {
      await db.from("auto_reminder_config").insert([formData]);
    }

    await logActivity(`Auto-reminder ${formData.enabled ? "enabled" : "disabled"}`);
    return { success: true };
  }, { success: false });
}

// ─── Queue Scheduled Reminders ────────────────────────────
export async function queueRemindersForAppointment(appointmentId: string) {
  return writeQuery(async () => {
    const db = getDb();
    const { data: apt } = await db
      .from("appointments")
      .select("id, patient_name, appointment_date, appointment_time")
      .eq("id", appointmentId)
      .single();
    if (!apt) throw new Error("Appointment not found");

    // Get config to determine timing
    const config = await getAutoReminderConfig();
    if (!config.enabled) return null;

    const apptDate = new Date(`${apt.appointment_date}T${apt.appointment_time || "09:00"}`);
    const firstReminderAt = new Date(apptDate.getTime() - config.first_reminder_hours * 60 * 60 * 1000);
    const secondReminderAt = config.second_reminder_hours > 0
      ? new Date(apptDate.getTime() - config.second_reminder_hours * 60 * 60 * 1000)
      : null;

    // Upsert scheduled reminder
    const { data: existing } = await db
      .from("scheduled_reminders")
      .select("id")
      .eq("appointment_id", appointmentId)
      .single();

    if (existing) {
      await db.from("scheduled_reminders").update({
        first_reminder_scheduled_at: firstReminderAt.toISOString(),
        second_reminder_scheduled_at: secondReminderAt?.toISOString() || null,
        channel: config.default_channel,
        status: "pending",
      }).eq("id", existing.id);
    } else {
      await db.from("scheduled_reminders").insert([{
        appointment_id: appointmentId,
        first_reminder_scheduled_at: firstReminderAt.toISOString(),
        second_reminder_scheduled_at: secondReminderAt?.toISOString() || null,
        channel: config.default_channel,
        status: "pending",
      }]);
    }

    return { queued: true, firstAt: firstReminderAt.toISOString(), secondAt: secondReminderAt?.toISOString() };
  }, null);
}

// ─── Process Scheduled Reminders (called by cron) ────────
export async function processScheduledReminders() {
  return safeQuery(async () => {
    const db = getDb();
    const now = new Date();
    const nowStr = now.toISOString();
    const tomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0];
    let sent = 0;
    let errors = 0;
    let queued = 0;

    // Step 1: Queue reminders for upcoming appointments that don't have one yet
    const config = await getAutoReminderConfig();
    if (config.enabled) {
      const today = now.toISOString().split("T")[0];
      const { data: upcomingAppts } = await db
        .from("appointments")
        .select("id, patient_name, appointment_date, appointment_time")
        .gte("appointment_date", today)
        .lte("appointment_date", tomorrow)
        .in("status", ["scheduled", "checked_in"])
        .order("appointment_date", { ascending: true })
        .limit(100);

      const appts = upcomingAppts || [];
      for (const apt of appts) {
        try {
          // Check if a scheduled_reminder already exists
          const { data: existing } = await db
            .from("scheduled_reminders")
            .select("id, first_reminder_sent_at, second_reminder_sent_at")
            .eq("appointment_id", apt.id)
            .maybeSingle();

          if (!existing) {
            const apptDate = new Date(`${apt.appointment_date}T${apt.appointment_time || "09:00"}`);
            const firstReminderAt = new Date(apptDate.getTime() - config.first_reminder_hours * 60 * 60 * 1000);
            const secondReminderAt = config.second_reminder_hours > 0
              ? new Date(apptDate.getTime() - config.second_reminder_hours * 60 * 60 * 1000)
              : null;

            await db.from("scheduled_reminders").insert([{
              appointment_id: apt.id,
              first_reminder_scheduled_at: firstReminderAt.toISOString(),
              second_reminder_scheduled_at: secondReminderAt?.toISOString() || null,
              channel: config.default_channel,
              status: "pending",
            }]);
            queued++;
          }
        } catch {
          // Appointment may already have a scheduled_reminder
        }
      }
    }

    // Step 2: Find pending reminders that are due
    const { data: pending, error: fetchError } = await db
      .from("scheduled_reminders")
      .select("*, appointments(patient_name, appointment_date, appointment_time, doctor_name)")
      .in("status", ["pending", "first_sent"])
      .lte("first_reminder_scheduled_at", nowStr)
      .limit(50);

    if (fetchError) throw fetchError;
    const items = pending || [];

    // Also get items with second reminder due
    const { data: secondDueItems } = await db
      .from("scheduled_reminders")
      .select("*, appointments(patient_name, appointment_date, appointment_time, doctor_name)")
      .eq("status", "first_sent")
      .lte("second_reminder_scheduled_at", nowStr)
      .limit(50);

    const allItems = [...items, ...(secondDueItems || [])];
    const seenIds = new Set<string>();

    for (const item of allItems) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);

      try {
        const apt = (item as any).appointments;
        if (!apt) continue;

        // Determine which reminder to send
        const firstDue = item.first_reminder_scheduled_at && new Date(item.first_reminder_scheduled_at) <= now && !item.first_reminder_sent_at;
        const secondDue = item.second_reminder_scheduled_at && new Date(item.second_reminder_scheduled_at) <= now && !item.second_reminder_sent_at;

        if (firstDue || secondDue) {
          const reminderLabel = firstDue && !item.first_reminder_sent_at ? "Auto-reminder (first)" : "Auto-reminder (second)";
          const channel = item.channel || "both";

          await db.from("activity_logs").insert([{
            action: `Reminder sent to ${apt.patient_name} for ${apt.appointment_date} at ${apt.appointment_time?.slice(0,5)} with ${apt.doctor_name} via ${channel} [${reminderLabel}]`,
            resource_type: "reminder",
            created_at: nowStr,
          }]);

          // Update scheduled reminder status
          const updates: Record<string, any> = {};
          if (firstDue && !item.first_reminder_sent_at) {
            updates.first_reminder_sent_at = nowStr;
            updates.status = item.second_reminder_scheduled_at ? "first_sent" : "both_sent";
          }
          if (secondDue && !item.second_reminder_sent_at) {
            updates.second_reminder_sent_at = nowStr;
            updates.status = "both_sent";
          }

          if (Object.keys(updates).length > 0) {
            await db.from("scheduled_reminders").update(updates).eq("id", item.id);
            sent++;
          }
        }
      } catch (err) {
        console.error("Error processing scheduled reminder:", err);
        errors++;
      }
    }

    // Log the processing run
    if (queued > 0 || sent > 0 || errors > 0) {
      await db.from("auto_reminder_logs").insert([{
        processed_at: nowStr,
        reminders_queued: queued,
        reminders_sent: sent,
        errors,
        details: { checkedItems: seenIds.size },
      }]);
    }

    return { queued, checked: seenIds.size, sent, errors };
  }, { queued: 0, checked: 0, sent: 0, errors: 0 });
}

// ─── Scheduled Reminder Stats ─────────────────────────────
export async function getScheduledReminderStats() {
  return safeQuery(async () => {
    const db = getDb();
    const now = new Date().toISOString();

    const [pending, sentToday, totalSent, config, logs] = await Promise.all([
      db.from("scheduled_reminders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("auto_reminder_logs").select("reminders_sent, processed_at").gte("processed_at", new Date().toISOString().split("T")[0] + "T00:00:00"),
      db.from("scheduled_reminders").select("id", { count: "exact", head: true }).in("status", ["first_sent", "both_sent"]),
      db.from("auto_reminder_config").select("*").limit(1).single(),
      db.from("auto_reminder_logs").select("*").order("processed_at", { ascending: false }).limit(5),
    ]);

    const todaySent = (sentToday.data || []).reduce((sum: number, l: any) => sum + (l.reminders_sent || 0), 0);

    return {
      pendingCount: pending.count ?? 0,
      todaySent,
      totalSent: totalSent.count ?? 0,
      config: config.data || null,
      recentLogs: logs.data || [],
    };
  }, { pendingCount: 0, todaySent: 0, totalSent: 0, config: null, recentLogs: [] });
}

// ─── Clinic Settings ────────────────────────────────────────
export async function getClinicSettings() {
  return safeQuery(async () => {
    const { data, error } = await getDb()
      .from("clinic_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data;
  }, null);
}

export async function updateClinicSettings(formData: Record<string, any>) {
  return writeQuery(async () => {
    const { data } = await getDb()
      .from("clinic_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!data?.id) {
      const { data: created, error: createError } = await getDb()
        .from("clinic_settings")
        .insert([{ ...formData, updated_at: new Date().toISOString() }])
        .select()
        .single();
      if (createError) throw new Error(createError.message);
      await logActivity("Created clinic settings");
      return created;
    }

    const { data: updated, error } = await getDb()
      .from("clinic_settings")
      .update({ ...formData, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logActivity("Updated clinic settings");
    return updated;
  }, null);
}
