"use client";

/**
 * Shown when something goes wrong during sign-in (e.g. callback error).
 * NextAuth sends ?error=... in the URL; we show it here so you can fix the issue.
 */

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Unknown error";

  return (
    <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        Sign-in problem
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Something went wrong during sign-in. The error code is:
      </p>
      <p className="mt-2 font-mono text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded break-all">
        {error}
      </p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        <strong>Configuration</strong> often means an <strong>AdapterError</strong> (Supabase
        failed while saving your session). In the terminal look for{" "}
        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">[FlowDesk Auth] Underlying cause</code>.
      </p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Open <a href="/api/debug-supabase" target="_blank" rel="noopener noreferrer" className="underline font-mono">/api/debug-supabase</a> in a new tab to see the <strong>exact Supabase error</strong> (e.g. schema not exposed or table missing).
      </p>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
        <p className="font-medium text-amber-900 dark:text-amber-200">Fix Supabase (AdapterError):</p>
        <ol className="mt-2 list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-300">
          <li>Supabase Dashboard → <strong>Settings</strong> → <strong>API</strong>. Find <strong>Exposed schemas</strong> (or <strong>Schema</strong> / <strong>Data API</strong>) and add <code>next_auth</code>, then save.</li>
          <li>In <strong>SQL Editor</strong>, run the full script from <code>supabase/next_auth_schema.sql</code> if you haven’t already.</li>
          <li>Use the <strong>service_role</strong> key (not anon) for <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>.</li>
        </ol>
      </div>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Back to FlowDesk
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-slate-500">Loading…</div>}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
