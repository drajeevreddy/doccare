-- ============================================================
-- DocCare - Electronic Medical Records System
-- Complete PostgreSQL Schema (Idempotent)
-- Migration: 00001
-- ============================================================

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.roles (name, description)
SELECT * FROM (VALUES
  ('super_admin', 'Full system access'),
  ('clinic_admin', 'Clinic administration access'),
  ('doctor', 'Physician access'),
  ('nurse', 'Nursing staff access'),
  ('receptionist', 'Front desk access'),
  ('pharmacist', 'Pharmacy access'),
  ('lab_technician', 'Laboratory access'),
  ('accountant', 'Billing and accounting access'),
  ('patient', 'Patient portal access')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = v.name);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'all')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, module, action)
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' REFERENCES public.roles(name),
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CLINICS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clinic_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL REFERENCES public.roles(name),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, user_id)
);

-- ============================================================
-- PATIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  blood_group TEXT,
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  occupation TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  insurance_provider TEXT,
  insurance_id TEXT,
  insurance_group TEXT,
  consent_form_signed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);

-- Patient Allergies
CREATE TABLE IF NOT EXISTS public.patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  reaction TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Medical History
CREATE TABLE IF NOT EXISTS public.patient_medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  diagnosis_date DATE,
  is_chronic BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Timeline
CREATE TABLE IF NOT EXISTS public.patient_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('appointment', 'lab_report', 'prescription', 'admission', 'note', 'billing', 'vaccination')),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  type TEXT CHECK (type IN ('consultation', 'follow_up', 'emergency', 'review', 'procedure')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- ============================================================
-- QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id),
  patient_id UUID REFERENCES public.patients(id),
  appointment_id UUID REFERENCES public.appointments(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_consultation', 'completed', 'skipped')),
  token_number INTEGER NOT NULL,
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONSULTATIONS / SOAP NOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.soap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id),
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  diagnosis TEXT,
  icd_codes TEXT[],
  vitals JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id),
  appointment_id UUID REFERENCES public.appointments(id),
  diagnosis TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  route TEXT DEFAULT 'oral',
  instructions TEXT,
  quantity INTEGER,
  refills INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- BILLING & INVOICES
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id),
  patient_id UUID REFERENCES public.patients(id),
  invoice_number TEXT UNIQUE NOT NULL,
  status invoice_status DEFAULT 'draft',
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax_percentage NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  type TEXT CHECK (type IN ('consultation', 'lab_test', 'procedure', 'medicine', 'other'))
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'insurance', 'bank_transfer')),
  reference_number TEXT,
  notes TEXT,
  received_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LABORATORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  sample_type TEXT,
  instructions TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  doctor_id UUID REFERENCES public.profiles(id),
  appointment_id UUID REFERENCES public.appointments(id),
  lab_technician_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'sample_collected', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  lab_test_id UUID REFERENCES public.lab_tests(id),
  result_value TEXT,
  reference_range TEXT,
  unit TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  verified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DIABETES ANALYTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hba1c_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  value NUMERIC(4,1) NOT NULL,
  date DATE NOT NULL,
  lab_order_id UUID REFERENCES public.lab_orders(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blood_sugar_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value NUMERIC(5,1) NOT NULL,
  type TEXT CHECK (type IN ('fasting', 'post_prandial', 'random', 'bedtime')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.diabetes_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id),
  hba1c NUMERIC(4,1),
  fasting_glucose NUMERIC(5,1),
  post_prandial_glucose NUMERIC(5,1),
  egfr NUMERIC(5,1),
  ascvd_risk NUMERIC(5,2),
  bmi NUMERIC(4,1),
  assessment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STORAGE BUCKETS SETUP
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('patient_documents', 'patient_documents', false),
  ('lab_reports', 'lab_reports', false),
  ('prescriptions', 'prescriptions', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hba1c_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin'))
  );

-- Patients
DROP POLICY IF EXISTS "Staff can view patients" ON public.patients;
CREATE POLICY "Staff can view patients"
  ON public.patients FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

DROP POLICY IF EXISTS "Staff can insert patients" ON public.patients;
CREATE POLICY "Staff can insert patients"
  ON public.patients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

DROP POLICY IF EXISTS "Staff can update patients" ON public.patients;
CREATE POLICY "Staff can update patients"
  ON public.patients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'clinic_admin', 'super_admin')));

-- Appointments
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
CREATE POLICY "Staff can view appointments"
  ON public.appointments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

DROP POLICY IF EXISTS "Staff can manage appointments" ON public.appointments;
CREATE POLICY "Staff can manage appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'receptionist', 'clinic_admin', 'super_admin')));

-- SOAP Notes
DROP POLICY IF EXISTS "Doctors can manage SOAP notes" ON public.soap_notes;
CREATE POLICY "Doctors can manage SOAP notes"
  ON public.soap_notes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'clinic_admin', 'super_admin')));

-- Prescriptions
DROP POLICY IF EXISTS "Doctors can manage prescriptions" ON public.prescriptions;
CREATE POLICY "Doctors can manage prescriptions"
  ON public.prescriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'clinic_admin', 'super_admin')));

-- Invoices
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
CREATE POLICY "Staff can view invoices"
  ON public.invoices FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

DROP POLICY IF EXISTS "Accountants can manage invoices" ON public.invoices;
CREATE POLICY "Accountants can manage invoices"
  ON public.invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('accountant', 'clinic_admin', 'super_admin')));

-- Lab Orders
DROP POLICY IF EXISTS "Staff can view lab orders" ON public.lab_orders;
CREATE POLICY "Staff can view lab orders"
  ON public.lab_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

DROP POLICY IF EXISTS "Lab technicians can manage orders" ON public.lab_orders;
CREATE POLICY "Lab technicians can manage orders"
  ON public.lab_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('lab_technician', 'doctor', 'clinic_admin', 'super_admin')));

-- HbA1c Records
DROP POLICY IF EXISTS "Staff can view HbA1c records" ON public.hba1c_records;
CREATE POLICY "Staff can view HbA1c records"
  ON public.hba1c_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

-- Activity Logs
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')));

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Staff can read patient documents" ON storage.objects;
CREATE POLICY "Staff can read patient documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('patient_documents', 'lab_reports', 'prescriptions') AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient'))
  );

DROP POLICY IF EXISTS "Staff can upload documents" ON storage.objects;
CREATE POLICY "Staff can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('patient_documents', 'lab_reports', 'prescriptions', 'avatars') AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================
-- USEFUL FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(clinic_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT JSONB_BUILD_OBJECT(
    'appointments_today', (SELECT COUNT(*) FROM public.appointments WHERE appointment_date = CURRENT_DATE AND clinic_id = $1),
    'active_patients', (SELECT COUNT(*) FROM public.patients WHERE is_active = true AND clinic_id = $1),
    'revenue_today', (SELECT COALESCE(SUM(total), 0) FROM public.invoices WHERE DATE(created_at) = CURRENT_DATE AND clinic_id = $1 AND status = 'paid'),
    'follow_ups_due', (SELECT COUNT(*) FROM public.appointments WHERE appointment_date > CURRENT_DATE AND type = 'follow_up' AND clinic_id = $1),
    'queue_count', (SELECT COUNT(*) FROM public.queue WHERE status = 'waiting' AND clinic_id = $1),
    'pending_reports', (SELECT COUNT(*) FROM public.lab_orders WHERE status IN ('ordered', 'sample_collected', 'in_progress') AND clinic_id = $1)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  month TEXT;
  seq INTEGER;
BEGIN
  year := TO_CHAR(NOW(), 'YY');
  month := TO_CHAR(NOW(), 'MM');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)), 0) + 1
  INTO seq
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || year || month || '-%';
  RETURN 'INV-' || year || month || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON public.patients;
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_patient_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), 'CREATE', 'patient', NEW.id::TEXT, JSONB_BUILD_OBJECT('name', NEW.first_name || ' ' || NEW.last_name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_patient_created ON public.patients;
CREATE TRIGGER on_patient_created
  AFTER INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.log_patient_creation();
