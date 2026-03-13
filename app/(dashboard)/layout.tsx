"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/email", label: "Email" },
  { href: "/calendar", label: "Calendar & Tasks" },
  { href: "/os", label: "Company OS" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "My Tasks" },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-slate-900 p-6">
        <p className="text-slate-700 dark:text-slate-300">Sign in to use FlowDesk.</p>
        <Link
          href="/"
          className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Go to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="w-[200px] shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4">
          <Link href="/email" className="text-lg font-semibold text-slate-900 dark:text-white">
            FlowDesk
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 px-2 pb-4">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-800">
          <Link
            href="/settings/labels"
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
          >
            Label settings
          </Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
