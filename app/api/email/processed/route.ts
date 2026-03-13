/**
 * GET /api/email/processed — List emails_processed for the current user.
 * Query: gps_label (filter), limit (default 50).
 */

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const gpsLabel = searchParams.get("gps_label") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  let query = supabase
    .from("emails_processed")
    .select("id, gmail_message_id, subject, sender_email, sender_name, received_at, gps_label, drip_label, confidence_score, summary, ai_draft, user_replied, waiting_on_since, processed_at")
    .eq("user_id", session.user.id)
    .order("received_at", { ascending: false })
    .limit(limit);
  if (gpsLabel) query = query.eq("gps_label", gpsLabel);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ emails: data ?? [] });
}
