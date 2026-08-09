-- Clinic settings — single-row configuration table
CREATE TABLE IF NOT EXISTS public.clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT,
  license_number TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  working_hours JSONB DEFAULT '{}',
  gst_percentage NUMERIC(5,2) DEFAULT 0,
  consultation_fee NUMERIC(10,2) DEFAULT 0,
  followup_fee NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  appointment_duration INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view clinic settings" ON public.clinic_settings;
CREATE POLICY "Staff can view clinic settings"
  ON public.clinic_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admin can manage clinic settings" ON public.clinic_settings;
CREATE POLICY "Admin can manage clinic settings"
  ON public.clinic_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'super_admin')));

-- Seed a default row if none exists
INSERT INTO public.clinic_settings (clinic_name, currency, appointment_duration, gst_percentage, consultation_fee, followup_fee, working_hours)
SELECT 'DocCare Clinic', 'INR', 30, 0, 0, 0, '{"monday":{"start":"09:00","end":"17:00"},"tuesday":{"start":"09:00","end":"17:00"},"wednesday":{"start":"09:00","end":"17:00"},"thursday":{"start":"09:00","end":"17:00"},"friday":{"start":"09:00","end":"17:00"},"saturday":{"start":"09:00","end":"17:00"}}'
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_settings);
