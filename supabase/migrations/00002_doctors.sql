-- ============================================================
-- Doctors table for clinic doctor management
-- Migration: 00002
-- ============================================================

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialization TEXT DEFAULT 'General',
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view doctors" ON public.doctors;
CREATE POLICY "Staff can view doctors"
  ON public.doctors FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage doctors" ON public.doctors;
CREATE POLICY "Admins can manage doctors"
  ON public.doctors FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin')));

-- Seed default doctors
INSERT INTO public.doctors (name, specialization) VALUES
  ('Dr. Sharma', 'Endocrinologist'),
  ('Dr. Verma', 'Cardiologist'),
  ('Dr. Gupta', 'General Physician')
ON CONFLICT DO NOTHING;
