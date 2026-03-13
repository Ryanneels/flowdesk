/**
 * GET /api/debug-gemini — Test that GEMINI_API_KEY works (no auth required).
 * Returns { ok: true, suggestedCategory } or { ok: false, error, geminiStatus?, geminiBody? }.
 */

import { suggestLabelForEmail } from "@/lib/gemini";
import { NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }
  const result = await suggestLabelForEmail({
    from: "newsletter@example.com",
    subject: "Your weekly digest",
    snippet: "Here are this week's top stories. Unsubscribe here.",
    enabledGpsKeys: ["newsletters", "fyi", "action-required"],
    enabledDripKeys: ["drip-delegate", "drip-produce"],
  });
  if (result != null) {
    return NextResponse.json({ ok: true, suggestedGps: result.gps, suggestedDrip: result.drip });
  }
  // Probe Gemini directly so we can return the exact error in the response
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Reply with exactly: ok" }] }],
      generationConfig: { maxOutputTokens: 64, temperature: 0 },
    }),
  });
  const body = (await res.json()) as Record<string, unknown>;
  return NextResponse.json(
    {
      ok: false,
      error: "Gemini returned no category. Key is set but the API call failed.",
      geminiStatus: res.status,
      geminiBody: body,
    },
    { status: 502 }
  );
}
