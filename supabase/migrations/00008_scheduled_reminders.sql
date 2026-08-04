-- Scheduled Reminders Configuration
-- Tracks auto-reminder settings and scheduled send times

CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  first_reminder_scheduled_at TIMESTAMPTZ,
  first_reminder_sent_at TIMESTAMPTZ,
  second_reminder_scheduled_at TIMESTAMPTZ,
  second_reminder_sent_at TIMESTAMPTZ,
  channel TEXT NOT NULL DEFAULT 'both' CHECK (channel IN ('email', 'sms', 'both')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'first_sent', 'both_sent', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-reminder configuration (global settings)
CREATE TABLE IF NOT EXISTS public.auto_reminder_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  default_channel TEXT NOT NULL DEFAULT 'both' CHECK (default_channel IN ('email', 'sms', 'both')),
  first_reminder_hours INTEGER NOT NULL DEFAULT 24,
  second_reminder_hours INTEGER NOT NULL DEFAULT 1,
  window_start_hour INTEGER NOT NULL DEFAULT 9,
  window_end_hour INTEGER NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-reminder processing log (for cron history)
CREATE TABLE IF NOT EXISTS public.auto_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reminders_queued INTEGER NOT NULL DEFAULT 0,
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  details JSONB
);

-- Enable RLS
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reminder_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all for authenticated users" ON public.scheduled_reminders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.auto_reminder_config
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.auto_reminder_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_appointment ON public.scheduled_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON public.scheduled_reminders(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled_at ON public.scheduled_reminders(first_reminder_scheduled_at) WHERE first_reminder_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auto_reminder_logs_processed ON public.auto_reminder_logs(processed_at DESC);

-- Insert default config
INSERT INTO public.auto_reminder_config (enabled, default_channel, first_reminder_hours, second_reminder_hours)
VALUES (false, 'both', 24, 1)
ON CONFLICT (id) DO NOTHING;
