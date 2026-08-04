-- ============================================================
-- Compatibility migration: add denormalized columns for frontend
-- Migration: 00003
-- ============================================================

-- Appointments: add simple text columns for quick frontend compatibility
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_time TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Appointment';

-- Lab orders: add simple text columns
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS test_name TEXT;
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'routine';
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS ref_range TEXT;
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS is_abnormal BOOLEAN DEFAULT false;

-- Invoices: add date column for dashboard compatibility
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status_text TEXT DEFAULT 'pending';

-- Queue: add denormalized fields
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS token TEXT;

-- Prescriptions: add denormalized fields
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS diagnosis TEXT;
