-- Add 'rescheduled' to appointment_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'appointment_status'::regtype
    AND enumlabel = 'rescheduled'
  ) THEN
    ALTER TYPE appointment_status ADD VALUE 'rescheduled';
  END IF;
END $$;
