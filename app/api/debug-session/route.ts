/**
 * GET /api/debug-session — After sign-in, open this to see if the server sees your session.
 * Helps debug "redirects back to sign-in" (cookie not set vs session lookup failure).
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  const cookieHeader = req.headers.get("cookie") ?? "";
  const hasSecureToken = cookieHeader.includes("__Secure-authjs.session-token=");
  const hasPlainToken = cookieHeader.includes("authjs.session-token=") && !cookieHeader.includes("__Secure-");
  const hasAnyAuthCookie = hasSecureToken || hasPlainToken;

  return NextResponse.json({
    sessionFound: !!session,
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
    cookiePresent: hasAnyAuthCookie,
    cookieVariant: hasSecureToken ? "__Secure- (production)" : hasPlainToken ? "plain (dev)" : "none",
    hint: !hasAnyAuthCookie
      ? "No session cookie in this request. The callback may not be setting the cookie, or it has wrong domain/path/secure."
      : !session
        ? "Cookie is present but session lookup failed (adapter/DB issue?). Check Supabase next_auth.sessions and Vercel logs."
        : "Session OK.",
  });
}
