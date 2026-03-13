/**
 * GET /api/debug-gmail-token — See why getGoogleAccessToken might fail.
 * Returns session user id and whether an account row exists (no token values).
 */

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in", sessionUserId: null });
  }

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    return NextResponse.json({
      sessionUserId: userId,
      error: "Supabase env missing",
      accountByUserId: null,
      accountByProviderId: null,
    });
  }

  const supabase = createClient(url, secret, {
    db: { schema: "next_auth" },
    auth: { persistSession: false },
  });

  // Query by userId (DB uuid)
  const byUserId = await supabase
    .from("accounts")
    .select("id, userId, provider, providerAccountId")
    .eq("userId", userId)
    .eq("provider", "google")
    .maybeSingle();

  // Query by providerAccountId (Google id) in case session has token.sub
  const byProviderId = await supabase
    .from("accounts")
    .select("id, userId, provider, providerAccountId")
    .eq("providerAccountId", userId)
    .eq("provider", "google")
    .maybeSingle();

  // Check if tokens exist (without returning values) - run one query that returns has_token flags
  const accountForTokens = byUserId.data ?? byProviderId.data;
  let hasAccessToken = false;
  let hasRefreshToken = false;
  if (accountForTokens?.id) {
    const tokenCheck = await supabase
      .from("accounts")
      .select("access_token, refresh_token")
      .eq("id", accountForTokens.id)
      .single();
    if (tokenCheck.data) {
      hasAccessToken = !!tokenCheck.data.access_token;
      hasRefreshToken = !!tokenCheck.data.refresh_token;
    }
  }

  // List all Google accounts (no tokens) to see what userIds exist
  const allGoogle = await supabase
    .from("accounts")
    .select("id, userId, providerAccountId, provider")
    .eq("provider", "google")
    .limit(5);

  return NextResponse.json({
    sessionUserId: userId,
    sessionUserIdLength: userId?.length ?? 0,
    hint: userId?.length === 36 && userId?.includes("-") ? "session id looks like UUID" : "session id might be Google id (numeric or long string)",
    accountByUserId: byUserId.error
      ? { error: byUserId.error.message }
      : byUserId.data
        ? { found: true, accountUserId: byUserId.data.userId, providerAccountId: byUserId.data.providerAccountId }
        : { found: false },
    accountByProviderId: byProviderId.error
      ? { error: byProviderId.error.message }
      : byProviderId.data
        ? { found: true, accountUserId: byProviderId.data.userId, providerAccountId: byProviderId.data.providerAccountId }
        : { found: false },
    tokensInAccount: accountForTokens ? { hasAccessToken, hasRefreshToken } : null,
    allGoogleAccounts: allGoogle.data ?? [],
    allGoogleError: allGoogle.error?.message ?? null,
  });
}
