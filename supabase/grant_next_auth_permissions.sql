-- Fix "permission denied for schema next_auth" (error 42501)
-- Run this in Supabase SQL Editor once. Safe to re-run.

GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT CREATE ON SCHEMA next_auth TO service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA next_auth TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA next_auth TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA next_auth TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON SEQUENCES TO service_role;
