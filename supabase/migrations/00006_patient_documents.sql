-- ============================================================
-- Patient Documents table for document management
-- Migration: 00006
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_type TEXT DEFAULT 'application/octet-stream',
  category TEXT DEFAULT 'other' CHECK (category IN ('report', 'prescription', 'lab_result', 'imaging', 'consent', 'identification', 'insurance', 'other')),
  storage_path TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  is_shared BOOLEAN DEFAULT false,
  shared_with_patient BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view patient documents" ON public.patient_documents;
CREATE POLICY "Staff can view patient documents"
  ON public.patient_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

DROP POLICY IF EXISTS "Patients can view own shared documents" ON public.patient_documents;
CREATE POLICY "Patients can view own shared documents"
  ON public.patient_documents FOR SELECT
  USING (
    shared_with_patient = true AND
    patient_id IN (SELECT id FROM public.patients WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Staff can upload documents" ON public.patient_documents;
CREATE POLICY "Staff can upload documents"
  ON public.patient_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient')));

DROP POLICY IF EXISTS "Staff can update documents" ON public.patient_documents;
CREATE POLICY "Staff can update documents"
  ON public.patient_documents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'clinic_admin', 'super_admin')));

DROP POLICY IF EXISTS "Staff can delete documents" ON public.patient_documents;
CREATE POLICY "Staff can delete documents"
  ON public.patient_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('clinic_admin', 'super_admin')));

-- Storage bucket for patient documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('patient_uploads', 'patient_uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can view patient uploads" ON storage.objects;
CREATE POLICY "Authenticated users can view patient uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'patient_uploads' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can upload to patient_uploads" ON storage.objects;
CREATE POLICY "Staff can upload to patient_uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient_uploads' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('patient'))
  );
