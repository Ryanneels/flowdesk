/**
 * GET /api/debug-auth-config — Check env and NextAuth dependency (next_auth schema).
 * Returns what's set and whether Supabase next_auth schema is reachable.
 * 500 on /api/auth/session usually means AUTH_SECRET missing or adapter (DB) failing.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const hasSecret = !!(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasGoogleId = !!process.env.GOOGLE_CLIENT_ID;
  const hasGoogleSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "(not set)";

  let nextAuthOk: boolean | string = false;
  if (hasSupabaseUrl && hasSupabaseKey) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        db: { schema: "next_auth" },
        auth: { persistSession: false },
      });
      const { error } = await supabase.from("users").select("id").limit(1);
      nextAuthOk = error ? `Schema error: ${error.message}` : true;
    } catch (err) {
      nextAuthOk = err instanceof Error ? err.message : String(err);
    }
  } else {
    nextAuthOk = "Supabase env missing";
  }

  const ok = hasSecret && hasSupabaseUrl && hasSupabaseKey && nextAuthOk === true;

  return NextResponse.json({
    ok,
    message: ok
      ? "Auth config looks good. If /api/auth/session still 500, check Vercel function logs for the real error."
      : "Fix the issues below, then redeploy.",
    AUTH_SECRET: hasSecret ? "set" : "MISSING — set in Vercel",
    AUTH_URL: authUrl,
    SUPABASE_URL: hasSupabaseUrl ? "set" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: hasSupabaseKey ? "set" : "MISSING",
    GOOGLE_CLIENT_ID: hasGoogleId ? "set" : "missing",
    GOOGLE_CLIENT_SECRET: hasGoogleSecret ? "set" : "missing",
    next_auth_schema: nextAuthOk === true ? "reachable" : nextAuthOk,
  });
}
