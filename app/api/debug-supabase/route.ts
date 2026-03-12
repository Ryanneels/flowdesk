/**
 * Tests Supabase connection and next_auth schema access.
 * Open /api/debug-supabase in the browser to see the real error if sign-in fails.
 * Remove or protect in production.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.local",
    });
  }

  try {
    const supabase = createClient(url, key, {
      db: { schema: "next_auth" },
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase next_auth schema is reachable.",
      rowCount: data?.length ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: message,
    });
  }
}
