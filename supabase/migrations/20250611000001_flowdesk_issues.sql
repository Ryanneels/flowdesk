-- FlowDesk — Issues (Company OS IDS: Identify, Discuss, Solve)
CREATE TABLE IF NOT EXISTS public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  urgency int DEFAULT 3 CHECK (urgency >= 1 AND urgency <= 5),
  status text DEFAULT 'open',
  created_by uuid REFERENCES next_auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  solved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_issues_company_id ON public.issues(company_id);
CREATE INDEX IF NOT EXISTS idx_issues_urgency ON public.issues(urgency);
GRANT ALL ON public.issues TO service_role;

COMMENT ON TABLE public.issues IS 'IDS: Identify, Discuss, Solve — ranked by urgency 1-5';
