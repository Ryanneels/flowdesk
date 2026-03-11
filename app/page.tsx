/**
 * FlowDesk — Landing Page (Phase 1)
 *
 * This is the first page visitors see. We'll replace it with a proper
 * dashboard and sign-in flow in Phase 2 (Auth).
 */

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 font-sans">
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        {/* Logo / app name */}
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          FlowDesk
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
          Smart Gmail &amp; Calendar — Phase 1
        </p>

        {/* Status card */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-slate-700 dark:text-slate-300">
            <strong>Phase 1 complete.</strong> Your Next.js app is set up and
            ready. Next steps: connect this project to GitHub and deploy to
            Vercel — see the README in the project folder for step-by-step
            instructions.
          </p>
        </div>

        {/* Quick links for beginners */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Next.js docs
          </a>
          <a
            href="https://vercel.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Vercel docs
          </a>
        </div>
      </main>
    </div>
  );
}
