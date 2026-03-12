/**
 * GET /api/debug-auth-url — Shows the callback URL that must be in Google Console.
 * Open this on your LIVE Vercel URL to confirm what redirect URI to add in Google.
 */

import { NextResponse } from "next/server";

export async function GET() {
  let authUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  // AUTH_URL must be the base path /api/auth, not the full callback URL
  if (authUrl.endsWith("/callback/google")) {
    authUrl = authUrl.replace(/\/callback\/google$/, "");
  }
  const callbackUrl = authUrl
    ? `${authUrl}/callback/google`
    : "(set AUTH_URL in Vercel to your app URL + /api/auth)";

  return NextResponse.json({
    message: "Add this EXACT URL to Google Cloud Console → Credentials → your OAuth client → Authorized redirect URIs",
    redirectUriForGoogle: callbackUrl,
    authUrlShouldBe: authUrl ? `${authUrl} (use this for AUTH_URL and NEXTAUTH_URL)` : "(not set)",
    authUrlActuallySet: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "(not set)",
    hint: "AUTH_URL and NEXTAUTH_URL must be the base path only, e.g. https://yourapp.vercel.app/api/auth (no /callback/google).",
  });
}
