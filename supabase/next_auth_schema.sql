-- FlowDesk — NextAuth tables for Supabase
-- Run this once in the Supabase SQL Editor: Dashboard → SQL Editor → New query → paste all → Run.
-- The last two lines expose the next_auth schema to the API (no dashboard setting needed).

--
-- Schema for Auth.js / NextAuth
--
CREATE SCHEMA IF NOT EXISTS next_auth;

GRANT USAGE ON SCHEMA next_auth TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA next_auth TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA next_auth TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA next_auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA next_auth GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA next_auth GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

--
-- Users (one row per signed-in identity)
--
CREATE TABLE IF NOT EXISTS next_auth.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text,
  "emailVerified" timestamp with time zone,
  image text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT email_unique UNIQUE (email)
);

GRANT ALL ON TABLE next_auth.users TO postgres;
GRANT ALL ON TABLE next_auth.users TO service_role;

--
-- Helper for RLS (Row Level Security) if you use it later
--
CREATE OR REPLACE FUNCTION next_auth.uid() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

--
-- Sessions (browser sessions)
--
CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expires timestamp with time zone NOT NULL,
  "sessionToken" text NOT NULL,
  "userId" uuid,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessionToken_unique UNIQUE ("sessionToken"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.sessions TO postgres;
GRANT ALL ON TABLE next_auth.sessions TO service_role;

--
-- Accounts (OAuth tokens — Gmail, Calendar, Tasks use these 24/7)
--
CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  "userId" uuid,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);

GRANT ALL ON TABLE next_auth.accounts TO postgres;
GRANT ALL ON TABLE next_auth.accounts TO service_role;

--
-- Verification tokens (e.g. email verification)
--
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier text,
  token text,
  expires timestamp with time zone NOT NULL,
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
  CONSTRAINT token_unique UNIQUE (token),
  CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);

GRANT ALL ON TABLE next_auth.verification_tokens TO postgres;
GRANT ALL ON TABLE next_auth.verification_tokens TO service_role;

--
-- Expose next_auth to the API (so the adapter can read/write)
-- This replaces adding "next_auth" in Dashboard → Settings → API → Exposed schemas
--
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, next_auth';
NOTIFY pgrst, 'reload schema';
