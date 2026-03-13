-- FlowDesk — Shared data model (tasks, rocks, projects, emails_processed, scorecard)
-- Run in Supabase SQL Editor. Uses next_auth.users for user_id.
-- company_id: for multi-tenant; single-user can create one company and use it.

--
-- Companies (for Rocks, Projects, Scorecard)
--
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.companies TO service_role;

--
-- Projects (Module 4)
--
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
GRANT ALL ON public.projects TO service_role;

--
-- Rocks (Company OS quarterly goals — Module 3)
--
CREATE TABLE IF NOT EXISTS public.rocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES next_auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  quarter text NOT NULL,
  status text DEFAULT 'on_track',
  progress_pct int DEFAULT 0,
  due_date timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rocks_company_id ON public.rocks(company_id);
CREATE INDEX IF NOT EXISTS idx_rocks_owner_id ON public.rocks(owner_id);
GRANT ALL ON public.rocks TO service_role;

--
-- Rock milestones (each can auto-create a task)
--
CREATE TABLE IF NOT EXISTS public.rock_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rock_id uuid NOT NULL REFERENCES public.rocks(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date timestamptz,
  completed boolean DEFAULT false,
  task_id uuid
);

CREATE INDEX IF NOT EXISTS idx_rock_milestones_rock_id ON public.rock_milestones(rock_id);
-- task_id FK added after tasks table exists
GRANT ALL ON public.rock_milestones TO service_role;

--
-- Tasks — universal task record (Email, OS, Projects, Calendar)
--
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'backlog',
  priority text DEFAULT 'p2',
  due_date timestamptz,
  estimated_minutes int,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  source text NOT NULL,
  source_id uuid,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  rock_id uuid REFERENCES public.rocks(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES next_auth.users(id) ON DELETE SET NULL,
  calendar_event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON public.tasks(source);
ALTER TABLE public.rock_milestones
  ADD CONSTRAINT rock_milestones_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

GRANT ALL ON public.tasks TO service_role;

--
-- Emails processed (Module 1 — AI classification + draft)
--
CREATE TABLE IF NOT EXISTS public.emails_processed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  subject text,
  sender_email text,
  sender_name text,
  received_at timestamptz,
  gps_label text,
  drip_label text,
  confidence_score int,
  ai_draft text,
  summary text,
  processed_at timestamptz DEFAULT now(),
  user_replied boolean DEFAULT false,
  waiting_on_since timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_emails_processed_user_id ON public.emails_processed(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_processed_gps_label ON public.emails_processed(gps_label);
CREATE INDEX IF NOT EXISTS idx_emails_processed_processed_at ON public.emails_processed(processed_at DESC);

GRANT ALL ON public.emails_processed TO service_role;

--
-- Scorecard (Company OS — Module 3)
--
CREATE TABLE IF NOT EXISTS public.scorecard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_id uuid,
  name text NOT NULL,
  owner_id uuid REFERENCES next_auth.users(id) ON DELETE SET NULL,
  goal_value numeric,
  goal_unit text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_company_id ON public.scorecard_metrics(company_id);
GRANT ALL ON public.scorecard_metrics TO service_role;

CREATE TABLE IF NOT EXISTS public.scorecard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid NOT NULL REFERENCES public.scorecard_metrics(id) ON DELETE CASCADE,
  week_of date NOT NULL,
  actual_value numeric,
  is_on_track boolean,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_entries_metric_id ON public.scorecard_entries(metric_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_entries_week_of ON public.scorecard_entries(week_of);
GRANT ALL ON public.scorecard_entries TO service_role;

--
-- Trigger: create task when rock_milestone is created
--
CREATE OR REPLACE FUNCTION public.rock_milestone_create_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.rocks%ROWTYPE;
  new_task_id uuid;
BEGIN
  SELECT * INTO r FROM public.rocks WHERE id = NEW.rock_id;
  INSERT INTO public.tasks (
    user_id,
    assignee_id,
    title,
    due_date,
    source,
    source_id,
    rock_id,
    status,
    priority
  ) VALUES (
    COALESCE(r.owner_id, (SELECT id FROM next_auth.users LIMIT 1)),
    COALESCE(r.owner_id, (SELECT id FROM next_auth.users LIMIT 1)),
    NEW.title,
    NEW.due_date,
    'os_rock',
    NEW.id,
    NEW.rock_id,
    'backlog',
    CASE r.status WHEN 'off_track' THEN 'p1' WHEN 'at_risk' THEN 'p2' ELSE 'p3' END
  )
  RETURNING id INTO new_task_id;
  NEW.task_id := new_task_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_rock_milestone_create_task ON public.rock_milestones;
CREATE TRIGGER tr_rock_milestone_create_task
  BEFORE INSERT ON public.rock_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.rock_milestone_create_task();

COMMENT ON TABLE public.tasks IS 'Universal task record; source = os_rock | project | email | manual';
COMMENT ON TABLE public.emails_processed IS 'Gmail messages classified with Email GPS + DRIP; ai_draft for reply';
COMMENT ON COLUMN public.tasks.source IS 'os_rock | project | email | manual';
