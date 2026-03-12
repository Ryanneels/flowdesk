/**
 * POST /api/gmail/process-inbox — Auto-label and archive inbox messages.
 * - Called with session: process only the signed-in user's inbox.
 * - Called with CRON_SECRET: process all users with Google accounts.
 * Query: maxMessages (default 10, max 20) per user.
 */

import { auth } from "@/auth";
import { processInboxForUser } from "@/lib/process-inbox-user";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

async function getUserIdList(req: NextRequest): Promise<string[] | { error: string; status: number }> {
  const session = await auth();
  const cronSecret =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    (req.nextUrl.searchParams.get("secret") === process.env.CRON_SECRET ? process.env.CRON_SECRET : null);

  if (cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) {
    const url = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) return { error: "Server config missing", status: 500 };
    const supabase = createClient(url, secret, { db: { schema: "next_auth" }, auth: { persistSession: false } });
    const { data, error } = await supabase.from("accounts").select("userId").eq("provider", "google");
    if (error) return { error: error.message, status: 500 };
    const ids = [...new Set((data ?? []).map((r) => r.userId as string))];
    return ids;
  }

  if (session?.user?.id) {
    return [session.user.id];
  }

  return { error: "Not signed in or invalid cron secret", status: 401 };
}

async function runProcessInbox(req: NextRequest) {
  const userIdList = await getUserIdList(req);
  if (Array.isArray(userIdList) && userIdList.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, byUser: {} });
  }
  if (!Array.isArray(userIdList)) {
    return NextResponse.json({ error: userIdList.error }, { status: userIdList.status });
  }

  const { searchParams } = new URL(req.url);
  const maxMessages = Math.min(Number(searchParams.get("maxMessages")) || 10, 20);
  const byUser: Record<string, number> = {};

  for (const userId of userIdList) {
    const n = await processInboxForUser(userId, { maxMessages: maxMessages });
    byUser[userId] = n;
  }

  const total = Object.values(byUser).reduce((a, b) => a + b, 0);
  return NextResponse.json({ ok: true, processed: total, byUser });
}

export async function GET(req: NextRequest) {
  return runProcessInbox(req);
}

export async function POST(req: NextRequest) {
  return runProcessInbox(req);
}
