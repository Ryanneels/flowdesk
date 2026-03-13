/**
 * POST /api/os/rock-milestones — Create milestone (triggers task creation in DB).
 * Body: { rock_id, title, due_date? }
 */

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  let body: { rock_id?: string; title?: string; due_date?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.rock_id || !body.title?.trim()) return NextResponse.json({ error: "rock_id and title required" }, { status: 400 });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("rock_milestones")
    .insert({
      rock_id: body.rock_id,
      title: body.title.trim(),
      due_date: body.due_date || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
