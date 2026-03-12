# FlowDesk — Supabase

## Run the NextAuth schema (one-time)

You need to run the schema SQL once in your Supabase project so sign-in can save users and sessions.

### Option A: SQL Editor (no CLI)

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project.
2. Go to **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Open the file **`supabase/next_auth_schema.sql`** in this repo, copy **all** of its contents, and paste into the editor.
5. Click **Run** (or Ctrl+Enter). You should see “Success. No rows returned.”
6. The script also exposes the `next_auth` schema to the API, so you don’t need to change any “Exposed schemas” setting.

### Option B: Supabase CLI

If you use the Supabase CLI and have linked this project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration in `supabase/migrations/20240312000000_next_auth.sql` will be applied.

---

## FlowDesk app tables (Phase 3)

After NextAuth is set up, run the app tables script once:

1. **SQL Editor** → **New query**.
2. Copy all of **`supabase/flowdesk_tables.sql`** and paste into the editor.
3. **Run**.

Then open **http://localhost:3000/api/debug-db** to confirm the connection (`"ok": true`).
