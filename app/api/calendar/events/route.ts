/**
 * GET /api/calendar/events — List Google Calendar events. Query: timeMin, timeMax (ISO), maxResults.
 */

import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/lib/google-token";
import { NextRequest, NextResponse } from "next/server";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const token = await getGoogleAccessToken(session.user.id);
  if (!token) return NextResponse.json({ error: "Google token missing" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get("timeMin") ?? new Date().toISOString();
  const timeMax = searchParams.get("timeMax") ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const maxResults = Math.min(Number(searchParams.get("maxResults")) || 50, 250);
  const url = new URL(CALENDAR_API);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "Calendar API error", details: text }, { status: res.status });
  }
  const data = (await res.json()) as { items?: Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }> };
  return NextResponse.json({ events: data.items ?? [] });
}
