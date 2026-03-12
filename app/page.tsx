/**
 * FlowDesk — Home / Dashboard
 *
 * Shows sign-in, session, and (when signed in) Gmail preview (Phase 4).
 */

import { AuthUI } from "@/app/components/AuthUI";
import { GmailPreview } from "@/app/components/GmailPreview";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 font-sans">
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          FlowDesk
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
          Smart Gmail &amp; Calendar — Phase 4
        </p>

        <div className="mt-12 flex flex-col gap-6 text-left">
          <AuthUI />
          <GmailPreview />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            <a href="/settings/labels" className="underline hover:text-slate-700 dark:hover:text-slate-300">
              Configure label categories (Phase 5)
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
