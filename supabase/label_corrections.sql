-- Label corrections: when user overrides AI suggestion (for future training / few-shot)
-- Run in Supabase SQL Editor once.

CREATE TABLE IF NOT EXISTS public.label_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  from_header text,
  subject text,
  snippet text,
  suggested_category_key text NOT NULL,
  chosen_category_key text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_label_corrections_user_id ON public.label_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_label_corrections_created_at ON public.label_corrections(created_at DESC);

GRANT ALL ON public.label_corrections TO service_role;

COMMENT ON TABLE public.label_corrections IS 'User overrides of AI label suggestions; used to improve suggestions over time';
