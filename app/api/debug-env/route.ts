/**
 * Safe env check for debugging "Configuration" errors.
 * Only shows whether vars are set, not their values.
 * Remove or protect this route in production.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const check = {
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL ?? "(not set)",
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  return NextResponse.json(check);
}
