-- Allow walk-in patients without a date_of_birth
ALTER TABLE public.patients ALTER COLUMN date_of_birth DROP NOT NULL;

-- Add walk-in flag for patient records created from the kiosk/queue
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT false;

-- Add walk-in flag to queue entries
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT false;
