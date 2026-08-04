-- ============================================================
-- Patient Notification Preferences table
-- Migration: 00007
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patient_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  reminder_hours_before INTEGER DEFAULT 24,
  second_reminder_hours INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patient_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own prefs" ON public.patient_notification_prefs;
CREATE POLICY "Patients can view own prefs"
  ON public.patient_notification_prefs FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Patients can update own prefs" ON public.patient_notification_prefs;
CREATE POLICY "Patients can update own prefs"
  ON public.patient_notification_prefs FOR UPDATE
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Staff can view all prefs" ON public.patient_notification_prefs;
CREATE POLICY "Staff can view all prefs"
  ON public.patient_notification_prefs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

DROP POLICY IF EXISTS "Staff can manage all prefs" ON public.patient_notification_prefs;
CREATE POLICY "Staff can manage all prefs"
  ON public.patient_notification_prefs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'clinic_admin', 'super_admin')));
