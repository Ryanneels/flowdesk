/**
 * Get a valid Google access token for the given user, refreshing if expired.
 * Used by Gmail, Calendar, and Tasks API routes.
 */

import { createClient } from "@supabase/supabase-js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!url || !secret || !clientId || !clientSecret) return null;

  const supabase = createClient(url, secret, {
    db: { schema: "next_auth" },
    auth: { persistSession: false },
  });

  const { data: account, error } = await supabase
    .from("accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("userId", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error || !account?.access_token || !account?.refresh_token) return null;

  const expiresAt = account.expires_at != null ? account.expires_at * 1000 : 0;
  const now = Date.now();
  const bufferMs = 60 * 1000;
  if (expiresAt > now + bufferMs) {
    return account.access_token;
  }

  const refreshed = await refreshGoogleToken(
    account.refresh_token,
    clientId,
    clientSecret
  );
  if (!refreshed) return account.access_token;

  const newExpiresAt = Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600);
  await supabase
    .from("accounts")
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
    })
    .eq("userId", userId)
    .eq("provider", "google");

  return refreshed.access_token;
}

async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in?: number } | null> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  return data.access_token ? { access_token: data.access_token, expires_in: data.expires_in } : null;
}
