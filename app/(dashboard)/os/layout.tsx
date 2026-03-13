"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_NAV = [
  { href: "/os", label: "Rocks" },
  { href: "/os/scorecard", label: "Scorecard" },
  { href: "/os/issues", label: "Issues" },
  { href: "/os/meetings", label: "Meetings (L10)" },
] as const;

export default function OSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Company OS</h1>
      <nav className="mt-2 flex gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
        {SUB_NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              pathname === href || (href !== "/os" && pathname.startsWith(href))
                ? "bg-teal-100 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">{children}</div>
    </div>
  );
}
