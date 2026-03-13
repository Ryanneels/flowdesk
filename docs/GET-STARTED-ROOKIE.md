# FlowDesk — Get started (step-by-step for beginners)

Follow these steps in order. If something doesn’t work, stop and check the step again before going on.

---

## Part 1: Get the app running on your computer

### Step 1.1 — Open the project in your terminal

1. On your computer, open **Cursor** (or whatever you use to edit the FlowDesk code).
2. Open the **terminal** inside Cursor (e.g. **Terminal → New Terminal** or the shortcut).
3. Make sure you’re “in” the FlowDesk folder. Type:
   ```bash
   cd flowdesk
   ```
   (If your FlowDesk folder is somewhere else, use that path instead, e.g. `cd "c:\Users\Ryan Neels\.cursor\flowdesk"`.)

### Step 1.2 — Install dependencies (one time)

In the same terminal, run:

```bash
npm install
```

Wait until it finishes. If you see errors in red, tell someone (or paste the error) before continuing.

### Step 1.3 — Add your environment variables

1. In the FlowDesk folder, find the file **`.env.local`** (it might be hidden; in Cursor you can open it from the file list).
2. If you don’t have `.env.local`, duplicate `.env.example` and rename the copy to `.env.local`.
3. Fill in every value that’s needed. At minimum you need something like (use your real values, not these examples):

   - `AUTH_SECRET` — a long random string (you can generate one online: “random string generator”).
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — from Google Cloud Console (see below if you don’t have these).
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project (Part 2).
   - `GEMINI_API_KEY` — from Google AI Studio, if you use AI labeling.
   - `NEXTAUTH_URL` — for local dev use: `http://localhost:3000`

4. Save the file.

### Step 1.4 — Run the app locally

In the same terminal, run:

```bash
npm run dev
```

You should see something like “Ready on http://localhost:3000”.

1. Open your browser.
2. Go to: **http://localhost:3000**
3. You should see the FlowDesk home page and a “Sign in with Google” button.

If that works, the app is running on your machine. You can leave this terminal open while you do the next parts.

---

## Part 2: Set up Supabase (the database)

Supabase is where FlowDesk stores companies, rocks, tasks, emails, etc.

### Step 2.1 — Create a Supabase project (if you don’t have one)

1. Go to **https://supabase.com** and sign in (or create an account).
2. Click **New Project**.
3. Pick an organization, name the project (e.g. “FlowDesk”), set a database password (save it somewhere safe), choose a region, then click **Create new project**.
4. Wait until the project is ready (green/“Active”).

### Step 2.2 — Get your Supabase URL and key

1. In the Supabase dashboard, open your project.
2. Click the **Settings** (gear) icon in the left sidebar.
3. Click **API** in the left menu.
4. You’ll see:
   - **Project URL** — copy this into `.env.local` as `SUPABASE_URL`.
   - **Project API keys** — under “service_role” (not anon), click **Reveal** and copy the key. Put it in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`.
5. Save `.env.local` again.

### Step 2.3 — Run the NextAuth schema (so sign-in works)

FlowDesk uses NextAuth and stores sessions in Supabase. You need the NextAuth tables first.

1. In the FlowDesk folder on your computer, open the file:
   **`supabase/next_auth_schema.sql`**
2. Select all the text (Ctrl+A / Cmd+A) and copy it.
3. In Supabase: left sidebar → **SQL Editor** → **New query**.
4. Paste the full script into the big text box.
5. Click **Run** (or the play button).
6. At the bottom you should see something like “Success. No rows returned.” If you see an error (red text), don’t go on—read the error and fix it (often it means the script was already run, or a typo).

### Step 2.4 — Run the FlowDesk tables (companies, tasks, email, etc.)

1. Open **`supabase/migrations/20250611000000_flowdesk_shared_schema.sql`** in FlowDesk.
2. Copy **all** of its contents.
3. In Supabase: **SQL Editor** → **New query**.
4. Paste and click **Run**. Again, expect “Success. No rows returned” (or similar).

### Step 2.5 — Run the Issues table (for Company OS)

1. Open **`supabase/migrations/20250611000001_flowdesk_issues.sql`** in FlowDesk.
2. Copy all of it.
3. In Supabase: **SQL Editor** → **New query**.
4. Paste and click **Run**.

After this, your database has all the tables FlowDesk needs.

---

## Part 3: Set up Google (so you can sign in and use Gmail/Calendar)

### Step 3.1 — Create a Google Cloud project (if you don’t have one)

1. Go to **https://console.cloud.google.com** and sign in.
2. Top bar: click the project dropdown → **New Project**.
3. Name it (e.g. “FlowDesk”), click **Create**.

### Step 3.2 — Turn on Google APIs

1. In the left menu go to **APIs & Services** → **Library**.
2. Search for **Gmail API** → open it → **Enable**.
3. Search for **Google Calendar API** → open it → **Enable**.

### Step 3.3 — Create OAuth credentials

1. Go to **APIs & Services** → **Credentials**.
2. Click **Create credentials** → **OAuth client ID**.
3. If asked to configure the consent screen:
   - Choose **External** (or Internal if it’s only for your org).
   - Fill in App name (e.g. “FlowDesk”), support email, and your email as developer. Save.
4. Back to Create OAuth client ID:
   - Application type: **Web application**.
   - Name: e.g. “FlowDesk web”.
   - Under **Authorized redirect URIs** click **Add URI** and add:
     - For local: `http://localhost:3000/api/auth/callback/google`
     - For production (later): `https://your-domain.com/api/auth/callback/google`
5. Click **Create**.
6. Copy the **Client ID** and **Client secret**. Put them in `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Save.

---

## Part 4: Use the app (first time)

### Step 4.1 — Restart the app (so it sees your .env.local)

1. In the terminal where `npm run dev` is running, press **Ctrl+C** to stop it.
2. Run again:
   ```bash
   npm run dev
   ```

### Step 4.2 — Sign in

1. In the browser go to **http://localhost:3000**.
2. Click **Sign in with Google**.
3. Pick your Google account and allow the permissions (Gmail, Calendar, etc.).
4. You should land on the **Email** page (or the main dashboard).

### Step 4.3 — Create a company (so you can use Company OS and Projects)

1. In the left sidebar click **Company OS**.
2. You’ll see “No company yet.” Click **Create company**.
3. When prompted, type a name (e.g. “My Company”) and confirm.
4. You should now see that company and can add **Rocks** (quarterly goals) and **Milestones** (each milestone will create a task automatically).

### Step 4.4 — Try the other sections

- **Email** — Use “Process inbox” to fetch and classify Gmail; use the filters to see Action Required, etc.
- **Projects** — Pick your company, create a project, open it to see the Board (Backlog / In Progress / In Review / Done). Add tasks and move them.
- **Calendar** — See your Google Calendar events in a weekly view.
- **My Tasks** — See all your tasks in one list (from Rocks, Projects, or manual). Filter by source and mark things Done.

---

## Part 5: Deploy to the internet (e.g. Vercel) — optional

When you’re ready to use FlowDesk from a real URL (not just localhost):

1. Push your code to **GitHub** (if you haven’t already).
2. Go to **https://vercel.com**, sign in, and **Import** your GitHub repo (FlowDesk).
3. In Vercel’s project settings, add **Environment Variables**: copy the same names and values from your `.env.local` (e.g. `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
4. For production, set **NEXTAUTH_URL** (and **AUTH_URL** if the app uses it) to your live URL, e.g. `https://your-app.vercel.app/api/auth`.
5. In Google Cloud, add your live URL to the OAuth redirect URIs:  
   `https://your-app.vercel.app/api/auth/callback/google`
6. Redeploy the app in Vercel. Then open the live URL and sign in with Google again.

---

## Quick checklist

- [ ] Terminal: `cd` into FlowDesk, ran `npm install`
- [ ] Created/edited `.env.local` with AUTH_SECRET, Google keys, Supabase URL and service_role key
- [ ] Ran `npm run dev` and opened http://localhost:3000
- [ ] Supabase: ran `next_auth_schema.sql`
- [ ] Supabase: ran `20250611000000_flowdesk_shared_schema.sql`
- [ ] Supabase: ran `20250611000001_flowdesk_issues.sql`
- [ ] Google Cloud: Gmail API and Calendar API enabled, OAuth client created, redirect URI added
- [ ] Signed in with Google and created a company in Company OS

If you get stuck, note exactly which step you’re on and what you see (error message or screenshot). That makes it much easier to fix.
