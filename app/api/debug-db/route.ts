/**
 * Phase 3 — Test that FlowDesk app tables exist and are writable.
 * GET /api/debug-db: inserts a test row into activity_log, reads it back, then deletes it.
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
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing",
    });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const testId = crypto.randomUUID();

  try {
    const { error: insertError } = await supabase.from("activity_log").insert({
      id: testId,
      user_id: null,
      action_type: "phase3_connection_test",
      details: { test: true },
    });

    if (insertError) {
      return NextResponse.json({
        ok: false,
        error: insertError.message,
        code: insertError.code,
        hint: "Run supabase/flowdesk_tables.sql in the SQL Editor if you haven't.",
      });
    }

    const { data: row, error: selectError } = await supabase
      .from("activity_log")
      .select("id, action_type, created_at")
      .eq("id", testId)
      .single();

    if (selectError || !row) {
      return NextResponse.json({
        ok: false,
        error: selectError?.message ?? "Row not found after insert",
      });
    }

    await supabase.from("activity_log").delete().eq("id", testId);

    return NextResponse.json({
      ok: true,
      message: "FlowDesk tables are connected. Phase 3 DB check passed.",
      testRow: { id: row.id, action_type: row.action_type, created_at: row.created_at },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message });
  }
}
