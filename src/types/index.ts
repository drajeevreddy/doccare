// ============================================================
// Core Types for Clinic Management & EMR System
// ============================================================

// --- Roles ---
export type UserRole =
  | "super_admin"
  | "clinic_admin"
  | "doctor"
  | "nurse"
  | "receptionist"
  | "pharmacist"
  | "lab_technician"
  | "accountant"
  | "patient";

export interface Role {
  id: string;
  name: UserRole;
  description: string;
  created_at: string;
}

export interface Permission {
  id: string;
  role_id: string;
  module: string;
  action: "create" | "read" | "update" | "delete" | "all";
  created_at: string;
}

// --- Auth ---
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Patients ---
export interface Patient {
  id: string;
  clinic_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  occupation?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_id?: string;
  insurance_group?: string;
  consent_form_signed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientAllergy {
  id: string;
  patient_id: string;
  allergen: string;
  severity: "mild" | "moderate" | "severe";
  reaction?: string;
  notes?: string;
  created_at: string;
}

export interface PatientMedicalHistory {
  id: string;
  patient_id: string;
  condition_name: string;
  diagnosis_date?: string;
  is_chronic: boolean;
  notes?: string;
  created_at: string;
}

export interface PatientTimelineEvent {
  id: string;
  patient_id: string;
  event_type: "appointment" | "lab_report" | "prescription" | "admission" | "note" | "billing" | "vaccination";
  title: string;
  description?: string;
  event_date: string;
  created_by: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// --- Appointments ---
export type AppointmentStatus = "scheduled" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  description?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  type: "consultation" | "follow_up" | "emergency" | "review" | "procedure";
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient?: Patient;
  doctor?: Profile;
}

// --- Consultations / SOAP Notes ---
export interface SOAPNote {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnosis?: string;
  icd_codes?: string[];
  vitals?: Vitals;
  created_at: string;
  updated_at: string;
}

export interface Vitals {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  blood_glucose?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
}

// --- Prescriptions ---
export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
  quantity: number;
  refills: number;
  is_active: boolean;
}

// --- Billing ---
export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled" | "refunded";

export interface Invoice {
  id: string;
  clinic_id: string;
  patient_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount: number;
  total: number;
  due_date: string;
  paid_at?: string;
  payment_method?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  type: "consultation" | "lab_test" | "procedure" | "medicine" | "other";
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: "cash" | "card" | "upi" | "insurance" | "bank_transfer";
  reference_number?: string;
  notes?: string;
  received_by: string;
  created_at: string;
}

// --- Laboratory ---
export interface LabTest {
  id: string;
  name: string;
  category: string;
  sample_type: string;
  instructions?: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface LabOrder {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  lab_technician_id?: string;
  status: "ordered" | "sample_collected" | "in_progress" | "completed" | "cancelled";
  priority: "routine" | "urgent" | "stat";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LabResult {
  id: string;
  lab_order_id: string;
  lab_test_id: string;
  result_value: string;
  reference_range?: string;
  unit?: string;
  is_abnormal: boolean;
  notes?: string;
  performed_by?: string;
  verified_by?: string;
  created_at: string;
}

// --- Diabetes Specific ---
export interface HbA1cRecord {
  id: string;
  patient_id: string;
  value: number;
  date: string;
  lab_order_id?: string;
  notes?: string;
  created_at: string;
}

export interface CGMRecord {
  id: string;
  patient_id: string;
  recorded_at: string;
  glucose_value: number;
  device?: string;
  notes?: string;
}

export interface BloodSugarLog {
  id: string;
  patient_id: string;
  recorded_at: string;
  value: number;
  type: "fasting" | "post_prandial" | "random" | "bedtime";
  notes?: string;
}

export interface DiabetesAssessment {
  id: string;
  patient_id: string;
  doctor_id: string;
  hba1c?: number;
  fasting_glucose?: number;
  post_prandial_glucose?: number;
  egfr?: number;
  ascvd_risk?: number;
  bmi?: number;
  assessment_date: string;
  notes?: string;
  created_at: string;
}

// --- Clinic ---
export interface Clinic {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  license_number?: string;
  is_active: boolean;
  created_at: string;
}

// --- Queue ---
export interface QueueEntry {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id?: string;
  priority: "normal" | "urgent" | "emergency";
  status: "waiting" | "called" | "in_consultation" | "completed" | "skipped";
  token_number: number;
  called_at?: string;
  completed_at?: string;
  created_at: string;
}

// --- Activity / Audit ---
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

// --- Dashboard Metrics ---
export interface DashboardMetrics {
  appointments_today: number;
  active_patients: number;
  revenue_today: number;
  follow_ups_due: number;
  queue_count: number;
  pending_reports: number;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  consultations: number;
  lab_orders: number;
}

export interface HbA1cTrend {
  date: string;
  patient_id: string;
  value: number;
}

// --- Utility Types ---
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export type SortDirection = "asc" | "desc";

export interface TableSort {
  column: string;
  direction: SortDirection;
}

export interface TableFilter {
  column: string;
  value: string | number | boolean | null;
  operator: "eq" | "neq" | "contains" | "gt" | "gte" | "lt" | "lte";
}
