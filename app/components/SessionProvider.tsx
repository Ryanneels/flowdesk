"use client";

/**
 * Wraps the app with NextAuth's SessionProvider so that client components
 * can use useSession() to read the current user. Must be a client component
 * because SessionProvider uses React context.
 */

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
