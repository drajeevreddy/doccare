-- ============================================================
-- Migration: 00007 - Bug fixes for the live database
--
-- Fixes several schema/code mismatches that silently broke writes:
--  1. appointments.start_time / end_time were NOT NULL with no default,
--     so every INSERT from the app failed ("null value in column ...").
--  2. appointments.type had a CHECK constraint rejecting the values the
--     UI sends ("Consultation", "Follow-up", ...) -> insert failed.
--  3. queue.status CHECK did not allow 'checked_in', which the app uses
--     when a patient checks in -> check-in insert failed.
--  4. Tables referenced by the app were never created by any migration:
--     medicines, patient_notification_prefs, scheduled_reminders,
--     auto_reminder_config, auto_reminder_logs.
-- ============================================================

-- 1. Appointments: give NOT NULL time columns a default so inserts that
--    omit them (older app versions) no longer fail.
ALTER TABLE public.appointments ALTER COLUMN start_time SET DEFAULT '09:00';
ALTER TABLE public.appointments ALTER COLUMN end_time SET DEFAULT '09:30';

-- 2. Appointments: relax the type CHECK constraint. The app stores
--    normalized lowercase values ('consultation', 'follow_up', ...) but
--    legacy/UI values must never block a save.
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_type_check;

-- 3. Queue: allow the 'checked_in' status the app writes on check-in.
ALTER TABLE public.queue DROP CONSTRAINT IF EXISTS queue_status_check;
ALTER TABLE public.queue
  ADD CONSTRAINT queue_status_check
  CHECK (status IN ('waiting', 'called', 'in_consultation', 'completed', 'skipped', 'checked_in'));

-- ============================================================
-- 4. Missing tables
-- ============================================================

-- Medicines / Pharmacy (00004 only altered an existing table; it never created it)
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  manufacturer TEXT,
  unit TEXT DEFAULT 'tablet',
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  unit_price NUMERIC(10,2) DEFAULT 0,
  selling_price NUMERIC(10,2) DEFAULT 0,
  requires_prescription BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view medicines" ON public.medicines;
CREATE POLICY "Staff can view medicines"
  ON public.medicines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Staff can manage medicines" ON public.medicines;
CREATE POLICY "Staff can manage medicines"
  ON public.medicines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('pharmacist', 'clinic_admin', 'super_admin', 'doctor')));

-- Patient notification preferences (portal)
CREATE TABLE IF NOT EXISTS public.patient_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  second_reminder_hours INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view own prefs" ON public.patient_notification_prefs;
CREATE POLICY "Patients can view own prefs"
  ON public.patient_notification_prefs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Patients can manage own prefs" ON public.patient_notification_prefs;
CREATE POLICY "Patients can manage own prefs"
  ON public.patient_notification_prefs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

-- Scheduled reminders (cron)
CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'both',
  first_reminder_scheduled_at TIMESTAMPTZ,
  second_reminder_scheduled_at TIMESTAMPTZ,
  first_reminder_sent_at TIMESTAMPTZ,
  second_reminder_sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_appt ON public.scheduled_reminders(appointment_id);

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view scheduled reminders" ON public.scheduled_reminders;
CREATE POLICY "Staff can view scheduled reminders"
  ON public.scheduled_reminders FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Staff can manage scheduled reminders" ON public.scheduled_reminders;
CREATE POLICY "Staff can manage scheduled reminders"
  ON public.scheduled_reminders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'super_admin', 'doctor', 'receptionist')));

-- Auto-reminder configuration (cron)
CREATE TABLE IF NOT EXISTS public.auto_reminder_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT false,
  default_channel TEXT DEFAULT 'both',
  first_reminder_hours INTEGER DEFAULT 24,
  second_reminder_hours INTEGER DEFAULT 1,
  window_start_hour INTEGER DEFAULT 9,
  window_end_hour INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-reminder processing log (cron)
CREATE TABLE IF NOT EXISTS public.auto_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  reminders_queued INTEGER DEFAULT 0,
  reminders_sent INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}'
);
