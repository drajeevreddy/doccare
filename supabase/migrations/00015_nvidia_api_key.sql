-- Add NVIDIA NIM API key to clinic settings for AI report analysis
ALTER TABLE public.clinic_settings ADD COLUMN IF NOT EXISTS nvidia_api_key TEXT;
