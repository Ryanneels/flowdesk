/**
 * POST /api/calendar/schedule — AI scheduling: fetch unscheduled tasks, find slots, create calendar events.
 * Stub: returns message. Full implementation would use Claude to suggest slots and create events.
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const token = await getGoogleAccessToken(session.user.id);
  if (!token) return NextResponse.json({ error: "Google token missing" }, { status: 400 });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, estimated_minutes")
    .eq("assignee_id", session.user.id)
    .is("scheduled_start", null)
    .not("due_date", "is", null)
    .in("status", ["backlog", "in_progress"])
    .limit(20);
  return NextResponse.json({
    ok: true,
    message: "AI scheduling stub. Implement: fetch calendar events, run Claude to suggest slots, create events and update tasks.",
    unscheduled_count: tasks?.length ?? 0,
  });
}
