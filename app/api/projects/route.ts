/**
 * GET /api/projects?company_id= — List projects.
 * POST /api/projects — Create project (body: company_id, name, description?).
 */

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const companyId = new URL(req.url).searchParams.get("company_id");
  if (!companyId) return NextResponse.json({ error: "company_id required" }, { status: 400 });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("projects")
    .select("id, company_id, name, description, status, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  let body: { company_id?: string; name?: string; description?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.company_id || !body.name?.trim()) return NextResponse.json({ error: "company_id and name required" }, { status: 400 });
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const supabase = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("projects")
    .insert({
      company_id: body.company_id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
