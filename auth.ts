/**
 * FlowDesk — Auth.js (NextAuth v5) configuration
 *
 * This file configures:
 * - Google OAuth with scopes for Gmail, Calendar, and Tasks
 * - Supabase adapter to store users, sessions, and tokens in the database
 *   (so we can use tokens 24/7 for background jobs even when the user is offline)
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";

// Only use Supabase adapter when env vars are set (so build succeeds without .env)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Request extra scopes so FlowDesk can read Gmail, Calendar, and Tasks
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/tasks",
          ].join(" "),
          // Required so Google returns a refresh_token we can store and use 24/7
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  adapter:
    supabaseUrl && supabaseSecret
      ? SupabaseAdapter({ url: supabaseUrl, secret: supabaseSecret })
      : undefined,
  // Explicit secret so NextAuth never falls back to missing config (avoids "Configuration" error)
  secret: process.env.AUTH_SECRET,
  // Our route is at app/api/auth/[...nextauth], so basePath must be /api/auth
  basePath: "/api/auth",
  // Trust the host (needed for Vercel and dev)
  trustHost: true,
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  callbacks: {
    // Add user id to the session so we can use it in the app
    session({ session, user }) {
      if (session.user) {
        (session.user as { id?: string }).id = user.id;
      }
      return session;
    },
  },
});
