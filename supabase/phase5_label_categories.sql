-- Phase 5 — User label category settings (which canned categories are used + Gmail label mapping)
-- Run in Supabase SQL Editor once.

CREATE TABLE IF NOT EXISTS public.user_label_categories (
  user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  category_key text NOT NULL,
  gmail_label_id text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, category_key)
);

CREATE INDEX IF NOT EXISTS idx_user_label_categories_user_id ON public.user_label_categories(user_id);

GRANT ALL ON public.user_label_categories TO service_role;

COMMENT ON TABLE public.user_label_categories IS 'Which canned categories the user uses and which Gmail label ID each maps to';
