/**
 * FlowDesk — NextAuth API route handler
 *
 * This catch-all route handles all auth URLs, e.g.:
 * - GET/POST /api/auth/signin
 * - GET/POST /api/auth/callback/google
 * - GET/POST /api/auth/signout
 * - etc.
 */

import type { NextRequest } from "next/server";
import { handlers } from "@/auth";

const { GET: authGet, POST: authPost } = handlers;

function errorHtml(message: string): string {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Auth Error</title></head><body style="font-family:sans-serif;max-width:600px;margin:2rem auto;padding:1rem;"><h1>Auth error (500)</h1><p>This is the real error so you can fix it:</p><pre style="background:#f5f5f5;padding:1rem;overflow:auto;">${escaped}</pre><p><a href="/">Back to FlowDesk</a></p></body></html>`;
}

async function handleRequest(
  handler: (req: NextRequest) => Promise<Response>,
  req: NextRequest
): Promise<Response> {
  try {
    return await handler(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[NextAuth] Callback error:", err);
    return new Response(errorHtml(message), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(authGet, req);
}

export async function POST(req: NextRequest) {
  return handleRequest(authPost, req);
}
