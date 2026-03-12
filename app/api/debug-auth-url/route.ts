/**
 * GET /api/debug-auth-url — Shows the callback URL that must be in Google Console.
 * Open this on your LIVE Vercel URL to confirm what redirect URI to add in Google.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  const callbackUrl = authUrl
    ? `${authUrl.replace(/\/$/, "")}/callback/google`
    : "(set AUTH_URL in Vercel to your app URL + /api/auth)";

  return NextResponse.json({
    message: "Add this EXACT URL to Google Cloud Console → Credentials → your OAuth client → Authorized redirect URIs",
    redirectUriForGoogle: callbackUrl,
    authUrlUsed: authUrl || "(not set)",
    hint: "If redirectUriForGoogle shows localhost or (not set), AUTH_URL is wrong or not set in Vercel. Redeploy after changing env.",
  });
}
