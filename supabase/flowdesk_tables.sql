-- FlowDesk — App tables (Phase 3)
-- Run in Supabase SQL Editor after next_auth is set up.
-- All tables use user_id referencing next_auth.users(id).

--
-- Label rules: approved email → label mapping (for Gmail auto-labeling)
--
CREATE TABLE IF NOT EXISTS public.label_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  label_name text NOT NULL,
  rule_pattern text,
  rule_type text DEFAULT 'ai_suggested',
  approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_label_rules_user_id ON public.label_rules(user_id);

--
-- Scheduled tasks: Google Tasks that have been slotted onto the calendar
--
CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  google_task_id text,
  title text NOT NULL,
  calendar_event_id text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_id ON public.scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_scheduled_at ON public.scheduled_tasks(scheduled_at);

--
-- Habits: recurring time blocks (e.g. "Exercise 7am–8am daily")
--
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  day_of_week int,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN public.habits.day_of_week IS '0=Sunday, 1=Monday, ... 6=Saturday; NULL = every day';

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);

--
-- Activity log: every action the app takes (for dashboard and debugging)
--
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES next_auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON public.activity_log(action_type);

--
-- Permissions for service_role (app uses this to read/write)
--
GRANT ALL ON public.label_rules TO service_role;
GRANT ALL ON public.scheduled_tasks TO service_role;
GRANT ALL ON public.habits TO service_role;
GRANT ALL ON public.activity_log TO service_role;
