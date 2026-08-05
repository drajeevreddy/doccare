-- Migration: 00008_clinic_isolation_rls.sql
-- Fix data leakage between clinics by adding clinic_id-based RLS policies
-- This ensures users only see data from their assigned clinic(s)

-- ============================================================
-- HELPER FUNCTION: Get current user's clinic_id(s)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_clinic_ids()
RETURNS UUID[] AS $$
DECLARE
  clinic_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT clinic_id)
  INTO clinic_ids
  FROM public.clinic_staff
  WHERE user_id = auth.uid()
    AND clinic_id IS NOT NULL;
  
  RETURN COALESCE(clinic_ids, '{}'::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For admin users who manage multiple clinics, they see all their clinics' data
-- For super_admin, they see everything (handled by role check in policies)

-- ============================================================
-- DROP EXISTING POLICIES (they don't filter by clinic)
-- ============================================================
DROP POLICY IF EXISTS "Staff can view patients" ON public.patients;
DROP POLICY IF EXISTS "Staff can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Staff can update patients" ON public.patients;

DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can manage appointments" ON public.appointments;

DROP POLICY IF EXISTS "Doctors can manage SOAP notes" ON public.soap_notes;

DROP POLICY IF EXISTS "Doctors can manage prescriptions" ON public.prescriptions;

DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Accountants can manage invoices" ON public.invoices;

DROP POLICY IF EXISTS "Staff can view lab orders" ON public.lab_orders;
DROP POLICY IF EXISTS "Lab technicians can manage orders" ON public.lab_orders;

DROP POLICY IF EXISTS "Staff can view HbA1c records" ON public.hba1c_records;

DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;

-- ============================================================
-- PATIENTS: Clinic-isolated policies
-- ============================================================
-- SELECT: Users see patients from their clinic(s)
CREATE POLICY "Staff can view patients in their clinic"
  ON public.patients FOR SELECT
  USING (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- INSERT: Staff can create patients in their clinic(s)
CREATE POLICY "Staff can insert patients in their clinic"
  ON public.patients FOR INSERT
  WITH CHECK (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- UPDATE: Staff can update patients in their clinic(s)
CREATE POLICY "Staff can update patients in their clinic"
  ON public.patients FOR UPDATE
  USING (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- APPOINTMENTS: Clinic-isolated policies
-- ============================================================
CREATE POLICY "Staff can view appointments in their clinic"
  ON public.appointments FOR SELECT
  USING (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Staff can manage appointments in their clinic"
  ON public.appointments FOR ALL
  USING (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'doctor', 'receptionist')
    )
  )
  WITH CHECK (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'doctor', 'receptionist')
    )
  );

-- ============================================================
-- SOAP NOTES: Clinic-isolated (via appointment/patient clinic)
-- ============================================================
CREATE POLICY "Doctors can manage SOAP notes in their clinic"
  ON public.soap_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.clinic_staff cs ON cs.clinic_id = a.clinic_id
      WHERE a.id = soap_notes.appointment_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = soap_notes.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- PRESCRIPTIONS: Clinic-isolated
-- ============================================================
CREATE POLICY "Doctors can manage prescriptions in their clinic"
  ON public.prescriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = prescriptions.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.clinic_staff cs ON cs.clinic_id = a.clinic_id
      WHERE a.id = prescriptions.appointment_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- INVOICES: Clinic-isolated
-- ============================================================
CREATE POLICY "Staff can view invoices in their clinic"
  ON public.invoices FOR SELECT
  USING (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Accountants can manage invoices in their clinic"
  ON public.invoices FOR ALL
  USING (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'accountant')
    )
  )
  WITH CHECK (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'accountant')
    )
  );

-- ============================================================
-- LAB ORDERS: Clinic-isolated
-- ============================================================
CREATE POLICY "Staff can view lab orders in their clinic"
  ON public.lab_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = lab_orders.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Lab technicians can manage orders in their clinic"
  ON public.lab_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = lab_orders.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'doctor', 'lab_technician')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = lab_orders.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'doctor', 'lab_technician')
    )
  );

-- ============================================================
-- HbA1c RECORDS: Clinic-isolated (via patient)
-- ============================================================
CREATE POLICY "Staff can view HbA1c records in their clinic"
  ON public.hba1c_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = hba1c_records.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================
-- ACTIVITY LOGS: Clinic-isolated (via user's clinic)
-- ============================================================
CREATE POLICY "Admins can view activity logs in their clinic"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.clinic_staff cs ON cs.user_id = p.id
      WHERE p.id = activity_logs.user_id
        AND cs.clinic_id = ANY(public.get_user_clinic_ids())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- PATIENT ALLERGIES: Clinic-isolated (via patient)
-- ============================================================
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage allergies in their clinic"
  ON public.patient_allergies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = patient_allergies.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- PATIENT MEDICAL HISTORY: Clinic-isolated (via patient)
-- ============================================================
ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage medical history in their clinic"
  ON public.patient_medical_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = patient_medical_history.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- PATIENT TIMELINE: Clinic-isolated (via patient)
-- ============================================================
ALTER TABLE public.patient_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage timeline in their clinic"
  ON public.patient_timeline FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = patient_timeline.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- BLOOD SUGAR LOGS: Clinic-isolated (via patient)
-- ============================================================
ALTER TABLE public.blood_sugar_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage blood sugar logs in their clinic"
  ON public.blood_sugar_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = blood_sugar_logs.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- DIABETES ASSESSMENTS: Clinic-isolated (via patient)
-- ============================================================
ALTER TABLE public.diabetes_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage diabetes assessments in their clinic"
  ON public.diabetes_assessments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE p.id = diabetes_assessments.patient_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- LAB TESTS: Global (reference data, not clinic-specific)
-- ============================================================
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lab tests"
  ON public.lab_tests FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage lab tests"
  ON public.lab_tests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- CLINICS: Admins can manage their own clinic
-- ============================================================
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their clinic"
  ON public.clinics FOR SELECT
  USING (
    id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Clinic admins can update their clinic"
  ON public.clinics FOR UPDATE
  USING (
    id = ANY(public.get_user_clinic_ids())
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- CLINIC STAFF: Users can view their own assignments, admins can manage
-- ============================================================
ALTER TABLE public.clinic_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clinic assignments"
  ON public.clinic_staff FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

CREATE POLICY "Admins can manage clinic staff"
  ON public.clinic_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- QUEUE: Clinic-isolated
-- ============================================================
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage queue in their clinic"
  ON public.queue FOR ALL
  USING (
    clinic_id = ANY(public.get_user_clinic_ids())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'doctor', 'receptionist', 'nurse')
    )
  );

-- ============================================================
-- PRESCRIPTION ITEMS: Clinic-isolated (via prescription -> patient)
-- ============================================================
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage prescription items in their clinic"
  ON public.prescription_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions pr
      JOIN public.patients p ON p.id = pr.patient_id
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE pr.id = prescription_items.prescription_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
    )
  );

-- ============================================================
-- INVOICE ITEMS: Clinic-isolated (via invoice)
-- ============================================================
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage invoice items in their clinic"
  ON public.invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.clinic_id = ANY(public.get_user_clinic_ids())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'accountant')
    )
  );

-- ============================================================
-- PAYMENTS: Clinic-isolated (via invoice)
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage payments in their clinic"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = payments.invoice_id
        AND i.clinic_id = ANY(public.get_user_clinic_ids())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'accountant')
    )
  );

-- ============================================================
-- LAB RESULTS: Clinic-isolated (via lab_order -> patient)
-- ============================================================
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage lab results in their clinic"
  ON public.lab_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_orders lo
      JOIN public.patients p ON p.id = lo.patient_id
      JOIN public.clinic_staff cs ON cs.clinic_id = p.clinic_id
      WHERE lo.id = lab_results.lab_order_id
        AND cs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'doctor', 'lab_technician')
    )
  );

-- ============================================================
-- STORAGE: Update bucket policies for clinic isolation
-- ============================================================
DROP POLICY IF EXISTS "Staff can read patient documents" ON storage.objects;
CREATE POLICY "Staff can read patient documents in their clinic"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('patient_documents', 'lab_reports', 'prescriptions') AND
    (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.clinic_staff cs ON cs.user_id = p.id
        WHERE p.id = (storage.foldername(name))[1]::UUID
          AND cs.clinic_id = ANY(public.get_user_clinic_ids())
      )
      OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

DROP POLICY IF EXISTS "Staff can upload documents" ON storage.objects;
CREATE POLICY "Staff can upload documents in their clinic"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('patient_documents', 'lab_reports', 'prescriptions', 'avatars') AND
    (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.clinic_staff cs ON cs.user_id = p.id
        WHERE p.id = (storage.foldername(name))[1]::UUID
          AND cs.clinic_id = ANY(public.get_user_clinic_ids())
      )
      OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')
      )
    )
  );