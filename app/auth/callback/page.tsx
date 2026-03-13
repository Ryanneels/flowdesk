"use client";

/**
 * Intermediate page after OAuth callback. Waits for session, then redirects to /.
 * If session never appears, fetches /api/debug-session and shows the result so we can fix the loop.
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [debug, setDebug] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace("/");
      return;
    }
    if (status === "unauthenticated") {
      const t = setTimeout(() => {
        fetch("/api/debug-session")
          .then((r) => r.json())
          .then(setDebug)
          .catch(() => setDebug({ error: "Fetch failed" }));
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-4">
        <p className="text-slate-600 dark:text-slate-400 text-center">
          {status === "loading" ? "Completing sign-in…" : status === "authenticated" ? "Redirecting…" : "Checking session…"}
        </p>
        {debug && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-left text-sm dark:border-slate-700 dark:bg-slate-800/50">
            <p className="font-medium text-slate-900 dark:text-white mb-2">Session debug (share this if sign-in still fails):</p>
            <pre className="whitespace-pre-wrap break-all text-xs text-slate-600 dark:text-slate-400">
              {JSON.stringify(debug, null, 2)}
            </pre>
            <p className="mt-2 text-amber-700 dark:text-amber-400 text-xs">{debug.hint as string}</p>
          </div>
        )}
      </div>
    </div>
  );
}
