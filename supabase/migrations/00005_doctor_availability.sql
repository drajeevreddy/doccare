-- ============================================================
-- Doctor Availability / Schedule Management
-- Migration: 00005
-- ============================================================

CREATE TABLE IF NOT EXISTS public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, day_of_week)
);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view availability" ON public.doctor_availability;
CREATE POLICY "Staff can view availability"
  ON public.doctor_availability FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage availability" ON public.doctor_availability;
CREATE POLICY "Admins can manage availability"
  ON public.doctor_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'clinic_admin', 'doctor')));

-- Seed default availability for existing doctors
INSERT INTO public.doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available)
SELECT d.id, days.day, '09:00', '17:00', days.day != 'sunday'
FROM public.doctors d
CROSS JOIN (
  VALUES ('monday'), ('tuesday'), ('wednesday'), ('thursday'), ('friday'), ('saturday'), ('sunday')
) AS days(day)
WHERE NOT EXISTS (
  SELECT 1 FROM public.doctor_availability da WHERE da.doctor_id = d.id AND da.day_of_week = days.day
);
