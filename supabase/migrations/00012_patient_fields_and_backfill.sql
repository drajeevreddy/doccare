-- Add diagnosis, last_visit, and status columns to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS last_visit DATE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add patient_id to queue entries that were created without it
-- This backfills existing data using patient_name matching
UPDATE public.queue q
SET patient_id = p.id
FROM public.patients p
WHERE q.patient_id IS NULL
  AND q.patient_name IS NOT NULL
  AND CONCAT(p.first_name, ' ', p.last_name) ILIKE q.patient_name;

-- Add patient_id to appointments created without it
UPDATE public.appointments a
SET patient_id = p.id
FROM public.patients p
WHERE a.patient_id IS NULL
  AND a.patient_name IS NOT NULL
  AND CONCAT(p.first_name, ' ', p.last_name) ILIKE a.patient_name;

-- Backfill last_visit from existing appointment data
UPDATE public.patients p
SET last_visit = (
  SELECT MAX(a.appointment_date)
  FROM public.appointments a
  WHERE a.patient_id = p.id
     OR a.patient_name = CONCAT(p.first_name, ' ', p.last_name)
)
WHERE last_visit IS NULL;
