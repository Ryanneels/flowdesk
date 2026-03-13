import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthUI } from "@/app/components/AuthUI";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/email");
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 font-sans">
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          FlowDesk
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
          Email · Calendar &amp; Tasks · Company OS · Projects
        </p>
        <div className="mt-12 flex flex-col gap-6 text-left">
          <AuthUI />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            <a href="/settings/labels" className="underline hover:text-slate-700 dark:hover:text-slate-300">
              Label settings
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
