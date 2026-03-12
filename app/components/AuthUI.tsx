"use client";

/**
 * Shows either "Sign in with Google" or the current user and a Sign out button.
 * Auth.js expects POST (with CSRF) for provider sign-in; GET /signin/google throws "Unsupported action".
 */

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function AuthUI() {
  const { data: session, status } = useSession();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      fetch("/api/auth/csrf")
        .then((res) => res.json())
        .then((data) => setCsrfToken(data.csrfToken ?? null))
        .catch(() => setCsrfToken(null));
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-slate-600 dark:text-slate-400">Checking session…</p>
      </div>
    );
  }

  if (!session) {
    const buttonClass =
      "flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <p className="mb-4 text-slate-700 dark:text-slate-300">
          Sign in with Google to connect Gmail, Calendar, and Tasks to FlowDesk.
        </p>
        <form
          action="/api/auth/signin/google"
          method="POST"
          className="flex flex-col gap-2"
        >
          {csrfToken && (
            <input name="csrfToken" type="hidden" value={csrfToken} />
          )}
          <input name="callbackUrl" type="hidden" value="/" />
          <button
            type="submit"
            disabled={!csrfToken}
            className={buttonClass}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {csrfToken ? "Sign in with Google" : "Loading…"}
          </button>
        </form>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {user?.image && (
          <Image
            src={user.image}
            alt={user.name ?? "Profile"}
            width={48}
            height={48}
            className="rounded-full"
          />
        )}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="font-medium text-slate-900 dark:text-white">
            Signed in as {user?.name ?? user?.email ?? "Unknown"}
          </p>
          {user?.email && (
            <p className="truncate text-sm text-slate-600 dark:text-slate-400">
              {user.email}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Phase 2 complete. Your tokens are stored in Supabase so FlowDesk can
            use Gmail, Calendar, and Tasks when you’re offline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
